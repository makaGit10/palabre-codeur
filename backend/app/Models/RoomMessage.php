<?php

namespace App\Models;

use App\Models\Concerns\HasAttachment;
use App\Models\Concerns\IsMessage;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['body', 'attachment_type', 'attachment_id'])]
class RoomMessage extends Model
{
    use HasAttachment, IsMessage;

    protected function casts(): array
    {
        return ['edited_at' => 'datetime', 'deleted_at' => 'datetime'];
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
