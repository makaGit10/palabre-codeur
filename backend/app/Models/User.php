<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Translation\HasLocalePreference;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

// Réputation, gains et solde ne sont jamais remplissables depuis une requête : seuls les services les modifient
#[Fillable(['name', 'email', 'password', 'country', 'city', 'locale'])]
#[Hidden(['password', 'remember_token', 'email', 'wallet_balance', 'wallet_held'])]
class User extends Authenticatable implements HasLocalePreference
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'reputation' => 'integer',
            'bounty_earnings' => 'integer',
            'wallet_balance' => 'integer',
            'wallet_held' => 'integer',
            'is_admin' => 'boolean',
            'is_moderator' => 'boolean',
        ];
    }

    /** Peut traiter les signalements : administrateur ou modérateur */
    public function canModerate(): bool
    {
        return (bool) $this->is_admin || (bool) $this->is_moderator;
    }

    /** Langue des e-mails et notifications envoyés à cette personne */
    public function preferredLocale(): string
    {
        return $this->locale ?: 'fr';
    }

    public function questions(): HasMany
    {
        return $this->hasMany(Question::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(Answer::class);
    }

    public function snippets(): HasMany
    {
        return $this->hasMany(Snippet::class);
    }

    public function walletTransactions(): HasMany
    {
        return $this->hasMany(WalletTransaction::class);
    }

    public function badges(): BelongsToMany
    {
        return $this->belongsToMany(Badge::class)->withPivot('awarded_at');
    }
}
