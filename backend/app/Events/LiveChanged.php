<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Signal « quelque chose a changé » envoyé aux navigateurs connectés.
 * Il ne transporte aucune donnée : seulement les rubriques touchées, l'auteur et l'heure.
 * Les écrans concernés rechargent ensuite leurs données par l'API habituelle, avec ses contrôles d'accès.
 */
class LiveChanged implements ShouldBroadcastNow
{
    use Dispatchable;

    /** @param  list<string>  $topics */
    public function __construct(
        public readonly array $topics,
        public readonly ?int $actorId,
        public readonly ?string $socketId,
        public readonly string $at,
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel('palabre');
    }

    public function broadcastAs(): string
    {
        return 'changed';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return ['topics' => $this->topics, 'actorId' => $this->actorId, 'socketId' => $this->socketId, 'at' => $this->at];
    }
}
