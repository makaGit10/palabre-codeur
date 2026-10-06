<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * En-têtes de sécurité envoyés avec chaque réponse : le navigateur ne devine pas le type de contenu,
 * la réponse ne peut pas être affichée dans un cadre d'un autre site, l'adresse de provenance transmise
 * reste minimale, et en HTTPS le navigateur n'accepte plus de revenir en clair (HSTS).
 * Le serveur web de production ajoute la politique de contenu (CSP) propre au front-end.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        header_remove('X-Powered-By'); // ne pas annoncer la version de PHP

        $response = $next($request);
        $headers = $response->headers;
        $headers->set('X-Content-Type-Options', 'nosniff');
        $headers->set('X-Frame-Options', 'DENY');
        $headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
        if ($request->is('api/*')) {
            $headers->set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
        }
        if ($request->isSecure()) {
            $headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
