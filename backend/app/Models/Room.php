<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Salon public (par sujet ou par pays) ou groupe privé (is_private, créé par un membre, avec un administrateur).
 */
#[Fillable(['slug', 'name', 'kind', 'description'])]
class Room extends Model
{
    public const TOPIC = 'topic';

    public const COUNTRY = 'country';

    public const GROUP = 'group';

    public const ROLE_ADMIN = 'admin';

    public const ROLE_MEMBER = 'member';

    // Un salon est public tant qu'on ne l'a pas créé comme groupe
    protected $attributes = ['is_private' => false];

    protected function casts(): array
    {
        return ['is_private' => 'boolean'];
    }

    public function messages(): HasMany
    {
        return $this->hasMany(RoomMessage::class);
    }

    public function latestMessage(): HasOne
    {
        return $this->hasOne(RoomMessage::class)->latestOfMany();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withPivot(['role', 'joined_at', 'last_read_message_id']);
    }

    public function isGroup(): bool
    {
        return $this->is_private;
    }

    /** Un salon public se lit sans compte ; un groupe se lit seulement par ses membres */
    public function canBeReadBy(?User $user): bool
    {
        return ! $this->is_private || ($user !== null && $this->isMember($user));
    }

    /** Écrire demande un compte ; dans un groupe, d'en être membre */
    public function canBeWrittenBy(User $user): bool
    {
        return ! $this->is_private || $this->isMember($user);
    }

    public function isMember(User $user): bool
    {
        return $this->members()->whereKey($user->id)->exists();
    }

    public function isAdmin(User $user): bool
    {
        return $this->members()->whereKey($user->id)->wherePivot('role', self::ROLE_ADMIN)->exists();
    }
}
