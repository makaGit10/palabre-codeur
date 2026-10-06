<?php

namespace App\Models;

use App\Models\Concerns\HasAttachment;
use App\Models\Concerns\IsMessage;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['body', 'attachment_type', 'attachment_id'])]
class DirectMessage extends Model
{
    use HasAttachment, IsMessage;

    protected function casts(): array
    {
        return ['read_at' => 'datetime', 'edited_at' => 'datetime', 'deleted_at' => 'datetime'];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
