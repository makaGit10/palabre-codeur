<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Mail\LoginLockedMail;
use App\Mail\PasswordResetCodeMail;
use App\Mail\VerificationCodeMail;
use App\Models\User;
use Illuminate\Contracts\Mail\Mailable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Sécurité du compte : vérification de l'adresse e-mail par code, mot de passe oublié par code,
 * blocage d'un compte après trop d'échecs de connexion (avec alerte par e-mail).
 */
class AccountSecurityService
{
    public function __construct(private readonly OneTimeCodeService $codes) {}

    // ——— Vérification de l'adresse e-mail (code à 6 chiffres, 2 minutes) ———

    public function verificationRequired(): bool
    {
        return (bool) config('palabre.features.email_verification');
    }

    /** Envoie un code, au plus un toutes les 30 secondes. $silent : une inscription réussit même si l'e-mail ne part pas */
    public function sendVerificationCode(User $user, bool $silent = false): void
    {
        if ($this->codes->cooldown("verify:{$user->id}", 30)) {
            if ($silent) {
                return;
            }
            throw new BusinessRuleException(__("Un code vient d'être envoyé. Patientez 30 secondes avant d'en demander un autre."), 429);
        }
        $minutes = (int) config('palabre.codes.verification_minutes');
        $code = $this->codes->issue("verify:{$user->id}", $minutes * 60);
        $this->deliver($user, new VerificationCodeMail($user, $code, $minutes), $silent);
    }

    public function verifyEmail(User $user, string $code): void
    {
        if ($user->email_verified_at) {
            return;
        }
        $this->codes->consume("verify:{$user->id}", $code);
        $user->forceFill(['email_verified_at' => now()])->save();
    }

    // ——— Mot de passe oublié (code à 6 chiffres, 10 minutes) ———

    /** Même comportement que l'adresse soit connue ou non : on ne révèle pas qui est inscrit */
    public function sendPasswordResetCode(string $email): void
    {
        $user = User::where('email', $email)->first();
        if (! $user || $this->codes->cooldown("reset:{$user->id}", 30)) {
            return;
        }
        $minutes = (int) config('palabre.codes.reset_minutes');
        $code = $this->codes->issue("reset:{$user->id}", $minutes * 60);
        $this->deliver($user, new PasswordResetCodeMail($user, $code, $minutes));
    }

    public function resetPassword(string $email, string $code, string $password): User
    {
        $user = User::where('email', $email)->first();
        if (! $user) {
            throw new BusinessRuleException(__('Code incorrect.'));
        }
        $this->codes->consume("reset:{$user->id}", $code);
        // Recevoir le code prouve que l'adresse est bien la sienne
        $user->forceFill(['password' => $password, 'email_verified_at' => $user->email_verified_at ?? now()])->save();
        $this->unlock($email);

        return $user;
    }

    // ——— Blocage après trop d'échecs de connexion ———

    public function assertNotLocked(string $email): void
    {
        $until = Cache::get("login_lock:{$email}");
        if ($until) {
            $minutes = max(1, (int) ceil(($until - now()->getTimestamp()) / 60));
            throw new BusinessRuleException(__('Trop de tentatives : les connexions à ce compte sont bloquées encore :minutes min.', ['minutes' => $minutes]), 423);
        }
    }

    /** Au N-ième échec, le compte est bloqué pour M minutes et son titulaire est prévenu par e-mail */
    public function recordFailure(string $email, string $ip): void
    {
        $max = (int) config('palabre.security.login_attempts');
        $seconds = (int) config('palabre.security.lock_minutes') * 60;
        Cache::add("login_fail:{$email}", 0, $seconds);
        if ((int) Cache::increment("login_fail:{$email}") < $max) {
            return;
        }

        Cache::put("login_lock:{$email}", now()->getTimestamp() + $seconds, $seconds);
        Cache::forget("login_fail:{$email}");
        if ($user = User::where('email', $email)->first()) {
            $this->deliver($user, new LoginLockedMail($user, $ip, intdiv($seconds, 60), $max), silent: true);
        }
    }

    public function unlock(string $email): void
    {
        Cache::forget("login_fail:{$email}");
        Cache::forget("login_lock:{$email}");
    }

    /** Envoi immédiat. Un serveur de mail indisponible devient une erreur 503 claire, ou un simple journal si $silent */
    private function deliver(User $user, Mailable $mailable, bool $silent = false): void
    {
        try {
            Mail::to($user)->send($mailable);
        } catch (Throwable $e) {
            Log::error('E-mail non envoyé : '.$e->getMessage(), ['user' => $user->id, 'mail' => $mailable::class]);
            if (! $silent) {
                throw new BusinessRuleException(__("Impossible d'envoyer l'e-mail pour le moment. Réessayez dans quelques instants."), 503);
            }
        }
    }
}
