<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Langue des messages de l'API (validation, règles métier, aperçus) : celle demandée par le front-end, français par défaut */
class SetLocale
{
    public const SUPPORTED = ['fr', 'en'];

    public function handle(Request $request, Closure $next): Response
    {
        // Sans en-tête Accept-Language, Symfony répondrait « en » : le français reste la langue par défaut,
        // et aussi celle de repli (un texte sans traduction anglaise s'affiche en français)
        $lang = $request->headers->has('Accept-Language') ? $request->getPreferredLanguage(self::SUPPORTED) : null;
        app()->setLocale(in_array($lang, self::SUPPORTED, true) ? $lang : 'fr');
        app()->setFallbackLocale('fr');

        return $next($request);
    }
}
