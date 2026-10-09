<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AccountSecurityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;

/** Mot de passe oublié : un code à 6 chiffres par e-mail, puis un nouveau mot de passe */
class PasswordResetController extends Controller
{
    public function __construct(private readonly AccountSecurityService $security) {}

    public function forgot(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'string', 'email']]);
        $this->security->sendPasswordResetCode(mb_strtolower(trim($data['email'])));

        // Réponse identique que l'adresse soit connue ou non
        return response()->json(['message' => __('Si un compte existe avec cette adresse, un code vient de lui être envoyé.')]);
    }

    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email'],
            'code' => ['required', 'digits:6'],
            'password' => ['required', 'string', Password::min(8)->letters()->numbers()],
        ], ['password' => __('Le mot de passe doit contenir au moins 8 caractères, dont des lettres et des chiffres.')]);

        $user = $this->security->resetPassword(mb_strtolower(trim($data['email'])), $data['code'], $data['password']);
        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return response()->json(['data' => AuthController::account($user)]);
    }
}
