<?php

use App\Exceptions\BusinessRuleException;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Le front-end React s'authentifie par cookie de session (Sanctum SPA), avec protection CSRF
        $middleware->statefulApi();
        // En-têtes de sécurité sur toutes les réponses
        $middleware->append(SecurityHeaders::class);
        // En production, l'API est derrière un serveur web qui termine le HTTPS : on lui fait confiance
        // pour l'adresse du client et le protocole (TRUSTED_PROXIES=127.0.0.1, ou * si le port n'est pas exposé)
        if ($proxies = env('TRUSTED_PROXIES')) {
            $middleware->trustProxies(at: $proxies === '*' ? '*' : array_map('trim', explode(',', $proxies)));
        }
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Une règle métier refusée (solde insuffisant…) est un cas normal, pas une erreur à journaliser
        $exceptions->dontReport(BusinessRuleException::class);

        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
