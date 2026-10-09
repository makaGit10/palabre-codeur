<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Participer (poser, répondre, voter, écrire, retirer) demande une adresse e-mail vérifiée par code */
class EnsureEmailIsVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (config('palabre.features.email_verification') && $user && ! $user->email_verified_at) {
            return response()->json([
                'message' => __('Vérifiez votre adresse e-mail pour participer.'),
                'code' => 'email_unverified',
            ], 403);
        }

        return $next($request);
    }
}
