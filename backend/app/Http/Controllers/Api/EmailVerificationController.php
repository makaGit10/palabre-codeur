<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AccountSecurityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Vérification de l'adresse e-mail de la personne connectée, par code à 6 chiffres */
class EmailVerificationController extends Controller
{
    public function __construct(private readonly AccountSecurityService $security) {}

    /** (Re)envoie un code, au plus une fois toutes les 30 secondes */
    public function send(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->email_verified_at) {
            return response()->json(['message' => __('Votre adresse e-mail est déjà vérifiée.')]);
        }
        $this->security->sendVerificationCode($user);

        return response()->json(['message' => __('Un nouveau code vient de vous être envoyé.')]);
    }

    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'digits:6']]);
        $this->security->verifyEmail($request->user(), $data['code']);

        return response()->json(['data' => AuthController::account($request->user()->refresh())]);
    }
}
