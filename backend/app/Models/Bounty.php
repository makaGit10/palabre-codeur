<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['amount', 'payment_method', 'expires_at'])]
class Bounty extends Model
{
    public const HELD = 'held';

    public const PAID = 'paid';

    public const REFUNDED = 'refunded';

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'paid_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_to_user_id');
    }
}
