<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        // refresh() relit les valeurs par défaut de la base (réputation 1, gains 0) avant de répondre
        $user = User::create($request->validated())->refresh();
        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return $this->me($request)->setStatusCode(201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);
        $credentials['email'] = mb_strtolower(trim($credentials['email']));

        if (! Auth::guard('web')->attempt($credentials, $request->boolean('remember'))) {
            // Message identique que l'e-mail existe ou non : on ne révèle pas qui est inscrit
            throw ValidationException::withMessages(['email' => 'Adresse e-mail ou mot de passe incorrect.']);
        }
        $request->session()->regenerate();

        return $this->me($request);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Vous êtes déconnecté.']);
    }

    /** Compte de la personne connectée : profil public + e-mail (visible par elle seule) */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user() ?? Auth::guard('web')->user();

        return response()->json(['data' => (new UserResource($user))->resolve($request) + ['email' => $user->email]]);
    }
}
