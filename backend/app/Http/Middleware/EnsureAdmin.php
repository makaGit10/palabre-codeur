<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Réservé aux administrateurs : vérifié côté serveur, jamais d'après une information envoyée par le navigateur */
class EnsureAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user()?->is_admin === true, 403, __('Réservé à la modération.'));

        return $next($request);
    }
}
