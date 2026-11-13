<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Paramètres de connexion temps réel pour le navigateur (aucun secret : la clé publique de l'application seulement) */
class LiveController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $enabled = config('broadcasting.default') === 'reverb' && config('broadcasting.connections.reverb.key');
        $public = config('palabre.live.public');

        return response()->json([
            'enabled' => (bool) $enabled,
            'key' => $enabled ? config('broadcasting.connections.reverb.key') : null,
            // Sans hôte imposé : celui par lequel la personne est arrivée (le site peut répondre à plusieurs adresses)
            'host' => filled($public['host']) ? $public['host'] : $request->getHost(),
            'port' => (int) $public['port'],
            'scheme' => $public['scheme'],
            'path' => trim((string) $public['path'], '/'),
            'channel' => 'palabre',
        ]);
    }
}
