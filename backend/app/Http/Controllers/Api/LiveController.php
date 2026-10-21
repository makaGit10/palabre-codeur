<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

/** Paramètres de connexion temps réel pour le navigateur (aucun secret : la clé publique de l'application seulement) */
class LiveController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $enabled = config('broadcasting.default') === 'reverb' && config('broadcasting.connections.reverb.key');
        $public = config('palabre.live.public');

        return response()->json([
            'enabled' => (bool) $enabled,
            'key' => $enabled ? config('broadcasting.connections.reverb.key') : null,
            'host' => $public['host'],
            'port' => (int) $public['port'],
            'scheme' => $public['scheme'],
            'path' => trim((string) $public['path'], '/'),
            'channel' => 'palabre',
        ]);
    }
}
