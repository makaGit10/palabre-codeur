<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Réservé aux responsables, vérifié côté serveur, jamais d'après une information envoyée par le navigateur.
 * « admin » : administrateurs et modérateurs (signalements) ; « admin:manage » : administrateurs seulement (membres et rôles).
 */
class EnsureAdmin
{
    public function handle(Request $request, Closure $next, string $level = 'moderate'): Response
    {
        $user = $request->user();
        $allowed = $level === 'manage' ? $user?->is_admin === true : $user?->canModerate() === true;
        abort_unless($allowed, 403, __('Réservé à la modération.'));

        return $next($request);
    }
}
