<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\Conversation;
use App\Models\DirectMessage;
use App\Models\Room;
use App\Models\RoomMessage;
use App\Models\User;
use App\Notifications\NewDirectMessage;
use App\Notifications\NewMention;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MessagingService
{
    // ——— Salons et groupes ———

    /** Salons publics, plus les groupes de la personne connectée, avec compteurs */
    public function roomsFor(?User $user): Collection
    {
        // Non-lus d'un groupe : messages des autres postés après le dernier message lu (repère exact, pas un horodatage)
        $lastRead = $user
            ? "COALESCE((SELECT last_read_message_id FROM room_user WHERE room_user.room_id = rooms.id AND room_user.user_id = {$user->id}), 0)"
            : '0';

        return Room::query()
            ->where(fn ($q) => $q->where('is_private', false)
                ->when($user, fn ($q) => $q->orWhereHas('members', fn ($m) => $m->whereKey($user->id))))
            ->with('latestMessage.author')
            ->withCount(['messages', 'members'])
            ->when($user, fn ($q) => $q->withCount(['messages as unread_count' => fn ($m) => $m
                ->where('user_id', '!=', $user->id)
                ->whereRaw("room_messages.id > {$lastRead}")]))
            ->orderBy('kind')
            ->orderBy('id')
            ->get();
    }

    /**
     * @param  array{type: string, id: int}|null  $attachment  question ou extrait de code partagé
     * @param  list<int>  $mentions  identifiants des personnes mentionnées avec @
     */
    public function postToRoom(Room $room, User $author, string $body, ?array $attachment = null, array $mentions = []): RoomMessage
    {
        if (! $room->canBeWrittenBy($author)) {
            throw new BusinessRuleException('Ce groupe est réservé à ses membres.', 403);
        }
        $message = $room->messages()->make(self::attributes($body, $attachment));
        $message->author()->associate($author)->save();
        $this->markRead($room, $author);
        $this->notifyMentions($room, $author, $message, $mentions);

        return $message;
    }

    /** Dernier message lu d'un groupe par un membre (pour les non-lus) */
    public function markRead(Room $room, User $user): void
    {
        if ($room->isGroup()) {
            $room->members()->updateExistingPivot($user->id, ['last_read_message_id' => (int) ($room->messages()->max('id') ?? 0)]);
        }
    }

    /** @param list<int> $memberIds */
    public function createGroup(User $creator, string $name, array $memberIds): Room
    {
        $ids = collect($memberIds)->map(fn ($id) => (int) $id)->unique()->reject(fn ($id) => $id === $creator->id)->values();
        if ($ids->isEmpty()) {
            throw new BusinessRuleException('Un groupe a besoin d’au moins une autre personne.');
        }
        if ($ids->count() + 1 > config('palabre.messages.max_group_members')) {
            throw new BusinessRuleException('Un groupe ne peut pas dépasser '.config('palabre.messages.max_group_members').' membres.');
        }

        return DB::transaction(function () use ($creator, $name, $ids) {
            $room = Room::create(['slug' => 'g-'.Str::lower(Str::random(10)), 'name' => $name, 'kind' => Room::GROUP, 'description' => null]);
            $room->forceFill(['is_private' => true, 'created_by' => $creator->id])->save();
            $room->members()->attach($creator->id, ['role' => Room::ROLE_ADMIN]);
            $room->members()->attach($ids->all(), ['role' => Room::ROLE_MEMBER]);

            return $room;
        });
    }

    /** @param list<int> $memberIds */
    public function addMembers(Room $room, User $admin, array $memberIds): void
    {
        $this->assertGroup($room);
        if (! $room->isAdmin($admin)) {
            throw new BusinessRuleException('Seul un administrateur du groupe peut ajouter des membres.', 403);
        }
        $existing = $room->members()->pluck('users.id');
        $ids = collect($memberIds)->map(fn ($id) => (int) $id)->unique()->reject(fn ($id) => $existing->contains($id))->values();
        if ($existing->count() + $ids->count() > config('palabre.messages.max_group_members')) {
            throw new BusinessRuleException('Un groupe ne peut pas dépasser '.config('palabre.messages.max_group_members').' membres.');
        }
        $room->members()->attach($ids->all(), ['role' => Room::ROLE_MEMBER]);
    }

    public function removeMember(Room $room, User $admin, User $target): void
    {
        $this->assertGroup($room);
        if (! $room->isAdmin($admin) || $admin->id === $target->id) {
            throw new BusinessRuleException('Seul un administrateur peut retirer un membre.', 403);
        }
        $room->members()->detach($target->id);
    }

    /** Quitter un groupe ; le dernier administrateur passe la main au membre le plus ancien ; un groupe vide est supprimé */
    public function leave(Room $room, User $user): void
    {
        $this->assertGroup($room);
        if (! $room->isMember($user)) {
            throw new BusinessRuleException('Vous ne faites pas partie de ce groupe.', 403);
        }

        DB::transaction(function () use ($room, $user) {
            $wasAdmin = $room->isAdmin($user);
            $room->members()->detach($user->id);
            $remaining = $room->members()->orderBy('room_user.joined_at')->get();
            if ($remaining->isEmpty()) {
                $room->delete();

                return;
            }
            if ($wasAdmin && ! $remaining->contains(fn (User $m) => $m->pivot->role === Room::ROLE_ADMIN)) {
                $room->members()->updateExistingPivot($remaining->first()->id, ['role' => Room::ROLE_ADMIN]);
            }
        });
    }

    private function assertGroup(Room $room): void
    {
        if (! $room->isGroup()) {
            throw new BusinessRuleException('Ce salon est public : il n’a pas de membres à gérer.');
        }
    }

    // ——— Messages privés ———

    /**
     * Envoie un message privé ; la conversation est créée au premier message, et le destinataire est notifié.
     *
     * @param  array{type: string, id: int}|null  $attachment
     */
    public function send(User $sender, User $recipient, string $body, ?array $attachment = null): DirectMessage
    {
        if ($sender->id === $recipient->id) {
            throw new BusinessRuleException('Vous ne pouvez pas vous écrire à vous-même.');
        }

        return DB::transaction(function () use ($sender, $recipient, $body, $attachment) {
            $conversation = Conversation::between($sender, $recipient);
            $message = $conversation->messages()->make(self::attributes($body, $attachment));
            $message->sender()->associate($sender)->save();
            $conversation->forceFill(['last_message_at' => now()])->save();
            $recipient->notify(new NewDirectMessage($message, $sender));

            return $message;
        });
    }

    /** Conversations de la personne, les plus récentes d'abord, avec le dernier message et le nombre de non-lus */
    public function conversationsFor(User $me): Collection
    {
        return Conversation::query()
            ->where(fn ($q) => $q->where('user_one_id', $me->id)->orWhere('user_two_id', $me->id))
            ->with(['userOne', 'userTwo', 'latestMessage'])
            ->withCount(['messages as unread_count' => fn ($q) => $q->whereNull('read_at')->where('sender_id', '!=', $me->id)])
            ->orderByDesc('last_message_at')
            ->get();
    }

    /**
     * Fil d'une conversation avec une personne ; les messages reçus sont marqués lus.
     *
     * @return Collection<int, DirectMessage>
     */
    public function thread(User $me, User $other): Collection
    {
        $conversation = Conversation::findBetween($me, $other);
        if (! $conversation) {
            return collect();
        }
        $conversation->messages()->whereNull('read_at')->where('sender_id', $other->id)->update(['read_at' => now()]);

        return $conversation->messages()->with('reactions')->orderByDesc('id')->limit(100)->get()->reverse()->values();
    }

    public function unreadMessagesCount(User $me): int
    {
        return DirectMessage::query()
            ->whereNull('read_at')
            ->where('sender_id', '!=', $me->id)
            ->whereHas('conversation', fn ($q) => $q->where('user_one_id', $me->id)->orWhere('user_two_id', $me->id))
            ->count();
    }

    // ——— Modifier, supprimer, réagir ———

    /** Modifiable par son auteur pendant la fenêtre d'édition (config palabre.messages) */
    public function edit(RoomMessage|DirectMessage $message, User $user, string $body): void
    {
        if (! $message->canBeEditedBy($user)) {
            $minutes = config('palabre.messages.edit_window_minutes');
            throw new BusinessRuleException("Un message ne peut être modifié que par son auteur, pendant {$minutes} minutes.", 403);
        }
        $message->forceFill(['body' => $body, 'edited_at' => now()])->save();
    }

    /** Supprimé pour tout le monde : le contenu disparaît, la place reste (« Message supprimé ») */
    public function delete(RoomMessage|DirectMessage $message, User $user): void
    {
        if (! $message->canBeDeletedBy($user)) {
            $hours = config('palabre.messages.delete_window_hours');
            throw new BusinessRuleException("Un message ne peut être supprimé que par son auteur, pendant {$hours} heures.", 403);
        }
        DB::transaction(function () use ($message) {
            $message->reactions()->delete();
            $message->forceFill(['body' => '', 'attachment_type' => null, 'attachment_id' => null, 'deleted_at' => now()])->save();
        });
    }

    /** Ajoute la réaction, ou la retire si elle existait déjà. Renvoie true si elle a été ajoutée. */
    public function toggleReaction(RoomMessage|DirectMessage $message, User $user, string $emoji): bool
    {
        if (! in_array($emoji, config('palabre.messages.reactions'), true)) {
            throw new BusinessRuleException('Cette réaction n’est pas proposée.');
        }
        if ($message->isDeleted()) {
            throw new BusinessRuleException('Ce message a été supprimé.');
        }
        $existing = $message->reactions()->where('user_id', $user->id)->where('emoji', $emoji)->first();
        if ($existing) {
            $existing->delete();

            return false;
        }
        $message->reactions()->create(['user_id' => $user->id, 'emoji' => $emoji]);

        return true;
    }

    /** Les personnes mentionnées avec @ sont notifiées, si elles peuvent lire le salon et ne sont pas l'auteur */
    private function notifyMentions(Room $room, User $author, RoomMessage $message, array $mentions): void
    {
        $ids = collect($mentions)->map(fn ($id) => (int) $id)->unique()->reject(fn ($id) => $id === $author->id);
        foreach (User::whereIn('id', $ids)->get() as $user) {
            if ($room->canBeReadBy($user)) {
                $user->notify(new NewMention($author, $room, $message));
            }
        }
    }

    private static function attributes(string $body, ?array $attachment): array
    {
        return [
            'body' => $body,
            'attachment_type' => $attachment['type'] ?? null,
            'attachment_id' => $attachment['id'] ?? null,
        ];
    }

    /** Texte d'aperçu d'un message (liste des conversations, notifications) */
    public static function preview(RoomMessage|DirectMessage $message): string
    {
        if ($message->isDeleted()) {
            return 'Message supprimé';
        }
        if ($message->body !== '') {
            return $message->body;
        }
        $attachment = $message->attachmentPayload();

        return $attachment ? ($attachment['type'] === 'snippet' ? 'Extrait partagé : ' : 'Question partagée : ').$attachment['title'] : '';
    }
}
