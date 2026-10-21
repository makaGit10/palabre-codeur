<?php

namespace App\Services\Live;

use App\Events\LiveChanged;
use Illuminate\Support\Facades\Log;
use Throwable;

/** Point d'envoi unique du signal temps réel : jamais bloquant, jamais fatal pour la requête en cours */
class LiveBroadcaster
{
    /** @param  list<string>  $topics */
    public function changed(array $topics, ?int $actorId = null, ?string $socketId = null): void
    {
        $topics = array_values(array_unique($topics));
        if ($topics === [] || config('broadcasting.default') === 'null') {
            return;
        }
        try {
            LiveChanged::dispatch($topics, $actorId, $socketId, now()->toIso8601String());
        } catch (Throwable $e) {
            Log::warning('Signal temps réel non envoyé : '.$e->getMessage(), ['topics' => $topics]);
        }
    }
}
