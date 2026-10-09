<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Comptes de démonstration proposés sur la page de connexion (jury du concours) : ceux de l'équipe.
 * Actif seulement si DEMO_ACCOUNTS_PUBLIC=true : le mot de passe commun des comptes de démo
 * (DEMO_PASSWORD) est alors public, par choix, le temps du concours.
 */
class DemoAccountController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        abort_unless(config('palabre.demo.accounts_public'), 404);

        $emails = config('palabre.demo.public_accounts', []);
        $users = User::whereIn('email', $emails)
            ->get()
            ->sortBy(fn (User $user) => array_search($user->email, $emails, true)) // ordre de la configuration
            ->values();

        return response()->json([
            'data' => $users->map(fn (User $user) => (new UserResource($user))->resolve($request) + ['email' => $user->email]),
            'password' => config('palabre.demo.password'),
        ]);
    }
}
