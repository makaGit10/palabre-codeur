<?php

namespace App\Services;

use App\Models\DirectMessage;
use App\Models\Question;
use App\Models\Room;
use App\Models\RoomMessage;
use App\Models\Snippet;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Recherche globale : un terme, des résultats groupés par section (questions, extraits, salons, membres, messages),
 * classés par pertinence (similarité par trigrammes de PostgreSQL, puis fraîcheur). Chaque section est limitée
 * pour rester instantanée ; on n'expose jamais ce que la personne n'a pas le droit de lire.
 */
class SearchService
{
    public const PER_SECTION = 5;

    public function search(string $q, ?User $viewer): array
    {
        $like = '%'.addcslashes($q, '%_\\').'%';
        $sections = [
            ['id' => 'questions', 'label' => 'Questions', 'items' => $this->questions($q, $like)],
            ['id' => 'snippets', 'label' => 'Extraits de code', 'items' => $this->snippets($q, $like)],
            ['id' => 'rooms', 'label' => 'Salons et groupes', 'items' => $this->rooms($q, $like, $viewer)],
            ['id' => 'users', 'label' => 'Membres', 'items' => $this->users($q, $like)],
            ['id' => 'messages', 'label' => 'Messages', 'items' => $this->messages($q, $like, $viewer)],
        ];

        return array_values(array_filter($sections, fn ($s) => $s['items']->isNotEmpty()));
    }

    private function questions(string $q, string $like): Collection
    {
        return Question::query()
            ->withCount('answers')
            ->where(fn ($w) => $w->where('title', 'ilike', $like)
                ->orWhereHas('tags', fn ($t) => $t->where('name', 'ilike', $like))
                ->orWhereRaw('similarity(title, ?) > 0.3', [$q]))
            ->orderByRaw('similarity(title, ?) DESC, created_at DESC', [$q])
            ->limit(self::PER_SECTION)
            ->get()
            ->map(fn (Question $x) => [
                'id' => $x->id,
                'title' => $x->title,
                'subtitle' => $x->answers_count.' '.($x->answers_count > 1 ? 'réponses' : 'réponse').($x->accepted_answer_id ? ' · résolue' : ''),
                'url' => "/app/questions/{$x->id}",
            ]);
    }

    private function snippets(string $q, string $like): Collection
    {
        return Snippet::query()
            ->where(fn ($w) => $w->where('title', 'ilike', $like)->orWhere('description', 'ilike', $like)->orWhere('language', 'ilike', $like)
                ->orWhereRaw('similarity(title, ?) > 0.3', [$q]))
            ->orderByRaw('similarity(title, ?) DESC, votes DESC', [$q])
            ->limit(self::PER_SECTION)
            ->get()
            ->map(fn (Snippet $x) => [
                'id' => $x->id,
                'title' => $x->title,
                'subtitle' => $x->language.' · '.Str::limit($x->description, 60),
                'url' => '/app/snippets',
            ]);
    }

    private function rooms(string $q, string $like, ?User $viewer): Collection
    {
        return Room::query()
            ->where(fn ($w) => $w->where('is_private', false)
                ->when($viewer, fn ($w) => $w->orWhereHas('members', fn ($m) => $m->whereKey($viewer->id))))
            ->where(fn ($w) => $w->where('name', 'ilike', $like)->orWhere('description', 'ilike', $like)->orWhereRaw('similarity(name, ?) > 0.3', [$q]))
            ->withCount('messages')
            ->orderByRaw('similarity(name, ?) DESC', [$q])
            ->limit(self::PER_SECTION)
            ->get()
            ->map(fn (Room $x) => [
                'id' => $x->id,
                'title' => $x->name,
                'subtitle' => ($x->is_private ? 'Groupe privé' : ($x->description ?? 'Salon')).' · '.$x->messages_count.' messages',
                'url' => "/app/salons/{$x->slug}",
            ]);
    }

    private function users(string $q, string $like): Collection
    {
        return User::query()
            ->where(fn ($w) => $w->where('name', 'ilike', $like)->orWhereRaw('similarity(name, ?) > 0.3', [$q]))
            ->orderByRaw('similarity(name, ?) DESC, reputation DESC', [$q])
            ->limit(self::PER_SECTION)
            ->get()
            ->map(fn (User $x) => [
                'id' => $x->id,
                'title' => $x->name,
                'subtitle' => $x->city.' · '.config("palabre.countries.{$x->country}.name", $x->country).' · '.number_format($x->reputation, 0, ',', ' ').($x->reputation > 1 ? ' pts' : ' pt'),
                'url' => "/app/profil/{$x->id}",
                'country' => $x->country,
            ]);
    }

    /** Messages des salons lisibles (publics, et groupes de la personne) et de ses conversations privées */
    private function messages(string $q, string $like, ?User $viewer): Collection
    {
        $rooms = RoomMessage::query()
            ->with(['author', 'room'])
            ->whereNull('deleted_at')
            ->where('body', 'ilike', $like)
            ->whereHas('room', fn ($r) => $r->where('is_private', false)
                ->when($viewer, fn ($r) => $r->orWhereHas('members', fn ($m) => $m->whereKey($viewer->id))))
            ->latest('id')
            ->limit(self::PER_SECTION)
            ->get()
            ->map(fn (RoomMessage $m) => [
                'id' => 'room-'.$m->id,
                'title' => "{$m->author->name} dans {$m->room->name}",
                'subtitle' => Str::limit(MessagingService::preview($m), 90),
                'url' => "/app/salons/{$m->room->slug}",
                'at' => $m->created_at,
            ]);

        $direct = $viewer
            ? DirectMessage::query()
                ->with(['sender', 'conversation.userOne', 'conversation.userTwo'])
                ->whereNull('deleted_at')
                ->where('body', 'ilike', $like)
                ->whereHas('conversation', fn ($c) => $c->where('user_one_id', $viewer->id)->orWhere('user_two_id', $viewer->id))
                ->latest('id')
                ->limit(self::PER_SECTION)
                ->get()
                ->map(function (DirectMessage $m) use ($viewer) {
                    $other = $m->conversation->otherParticipant($viewer);

                    return [
                        'id' => 'direct-'.$m->id,
                        'title' => ($m->sender_id === $viewer->id ? 'Vous' : $m->sender->name).' · conversation avec '.$other->name,
                        'subtitle' => Str::limit(MessagingService::preview($m), 90),
                        'url' => "/app/messages/{$other->id}",
                        'at' => $m->created_at,
                    ];
                })
            : collect();

        return $rooms->concat($direct)->sortByDesc('at')->take(self::PER_SECTION)->values()->map(fn ($item) => collect($item)->except('at')->all());
    }
}
