<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\Conversation;
use App\Models\DirectMessage;
use App\Models\Room;
use App\Models\RoomMessage;
use App\Models\User;
use App\Notifications\NewDirectMessage;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class MessagingService
{
    /** @param array{type: string, id: int}|null $attachment question ou extrait de code partagé */
    public function postToRoom(Room $room, User $author, string $body, ?array $attachment = null): RoomMessage
    {
        $message = $room->messages()->make(self::attributes($body, $attachment));
        $message->author()->associate($author)->save();

        return $message;
    }

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

    private static function attributes(string $body, ?array $attachment): array
    {
        return [
            'body' => $body,
            'attachment_type' => $attachment['type'] ?? null,
            'attachment_id' => $attachment['id'] ?? null,
        ];
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

        return $conversation->messages()->orderByDesc('id')->limit(100)->get()->reverse()->values();
    }

    public function unreadMessagesCount(User $me): int
    {
        return DirectMessage::query()
            ->whereNull('read_at')
            ->where('sender_id', '!=', $me->id)
            ->whereHas('conversation', fn ($q) => $q->where('user_one_id', $me->id)->orWhere('user_two_id', $me->id))
            ->count();
    }

    /** Texte d'aperçu d'un message (liste des conversations, notifications) */
    public static function preview(RoomMessage|DirectMessage $message): string
    {
        if ($message->body !== '') {
            return $message->body;
        }
        $attachment = $message->attachmentPayload();

        return $attachment ? ($attachment['type'] === 'snippet' ? 'Extrait partagé : ' : 'Question partagée : ').$attachment['title'] : '';
    }
}
