<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use Illuminate\Support\Facades\Cache;

/**
 * Codes à usage unique à 6 chiffres (vérification de l'adresse e-mail, mot de passe oublié).
 * Le code n'est jamais stocké en clair : seule son empreinte est gardée, avec sa date d'expiration,
 * et cinq essais au plus. Un délai minimum sépare deux envois pour une même personne.
 */
class OneTimeCodeService
{
    public const MAX_ATTEMPTS = 5;

    /** Génère un code, le garde (haché) pendant $ttlSeconds et le renvoie en clair, pour l'envoyer */
    public function issue(string $key, int $ttlSeconds): string
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        Cache::put("code:{$key}", [
            'hash' => hash('sha256', $code),
            'attempts' => 0,
            'expires_at' => now()->getTimestamp() + $ttlSeconds,
        ], $ttlSeconds);

        return $code;
    }

    /** Vrai si un code a déjà été envoyé il y a moins de $seconds secondes (anti-rafale) */
    public function cooldown(string $key, int $seconds): bool
    {
        return ! Cache::add("code_sent:{$key}", 1, $seconds);
    }

    /** Vérifie le code : expiré, trop d'essais ou faux → exception claire ; juste → le code est consommé */
    public function consume(string $key, string $code): void
    {
        $entry = Cache::get("code:{$key}");
        $remaining = $entry ? $entry['expires_at'] - now()->getTimestamp() : 0;
        if (! $entry || $remaining <= 0) {
            Cache::forget("code:{$key}");
            throw new BusinessRuleException(__('Ce code a expiré. Demandez-en un nouveau.'));
        }

        if (! hash_equals($entry['hash'], hash('sha256', trim($code)))) {
            $entry['attempts']++;
            if ($entry['attempts'] >= self::MAX_ATTEMPTS) {
                Cache::forget("code:{$key}");
                throw new BusinessRuleException(__("Trop d'essais. Demandez un nouveau code."));
            }
            Cache::put("code:{$key}", $entry, $remaining);
            throw new BusinessRuleException(__('Code incorrect.'));
        }

        Cache::forget("code:{$key}");
    }
}
