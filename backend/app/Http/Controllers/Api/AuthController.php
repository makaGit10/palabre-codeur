<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AccountSecurityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private readonly AccountSecurityService $security) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        // La langue de l'interface au moment de l'inscription devient celle des e-mails envoyés plus tard
        $user = User::create($request->validated() + ['locale' => app()->getLocale()]);
        if (! $this->security->verificationRequired()) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }
        $user->refresh(); // relit les valeurs par défaut de la base (réputation 1, gains 0) avant de répondre
        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        // Le code part tout de suite ; si l'e-mail échoue, l'inscription reste valide et « Renvoyer le code » prend le relais
        if ($this->security->verificationRequired()) {
            $this->security->sendVerificationCode($user, silent: true);
        }

        return response()->json(['data' => self::account($user)], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);
        $credentials['email'] = mb_strtolower(trim($credentials['email']));

        // Compte bloqué après trop d'échecs : même le bon mot de passe attend la fin du blocage
        $this->security->assertNotLocked($credentials['email']);

        if (! Auth::guard('web')->attempt($credentials, $request->boolean('remember'))) {
            $this->security->recordFailure($credentials['email'], (string) $request->ip());
            // Message identique que l'e-mail existe ou non : on ne révèle pas qui est inscrit
            throw ValidationException::withMessages(['email' => __('Adresse e-mail ou mot de passe incorrect.')]);
        }
        $this->security->unlock($credentials['email']);
        $request->session()->regenerate();

        return $this->me($request);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => __('Vous êtes déconnecté.')]);
    }

    /** Compte de la personne connectée */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user() ?? Auth::guard('web')->user();

        return response()->json(['data' => self::account($user)]);
    }

    /** Profil public + e-mail, état de vérification et langue : visibles par la personne seule */
    public static function account(User $user): array
    {
        return (new UserResource($user))->resolve(request()) + [
            'email' => $user->email,
            'emailVerified' => $user->email_verified_at !== null,
            'locale' => $user->locale ?? 'fr',
            'isAdmin' => (bool) $user->is_admin,
        ];
    }
}
