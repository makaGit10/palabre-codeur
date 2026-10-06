<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['user_one_id', 'user_two_id'])]
class Conversation extends Model
{
    protected function casts(): array
    {
        return ['last_message_at' => 'datetime'];
    }

    /** Les deux participants sont rangés par id croissant : une seule conversation par paire */
    private static function orderedIds(User $a, User $b): array
    {
        return $a->id < $b->id ? [$a->id, $b->id] : [$b->id, $a->id];
    }

    public static function between(User $a, User $b): self
    {
        [$one, $two] = self::orderedIds($a, $b);

        return static::firstOrCreate(['user_one_id' => $one, 'user_two_id' => $two]);
    }

    public static function findBetween(User $a, User $b): ?self
    {
        [$one, $two] = self::orderedIds($a, $b);

        return static::where('user_one_id', $one)->where('user_two_id', $two)->first();
    }

    public function userOne(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_one_id');
    }

    public function userTwo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_two_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(DirectMessage::class);
    }

    public function latestMessage(): HasOne
    {
        return $this->hasOne(DirectMessage::class)->latestOfMany();
    }

    public function otherParticipant(User $me): User
    {
        return $this->user_one_id === $me->id ? $this->userTwo : $this->userOne;
    }
}
