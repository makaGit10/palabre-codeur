<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['reportable_type', 'reportable_id', 'reason', 'details'])]
class Report extends Model
{
    public const TYPES = ['question' => Question::class, 'answer' => Answer::class, 'snippet' => Snippet::class];

    public const REASONS = ['spam', 'offensive', 'wrong', 'other'];

    protected function casts(): array
    {
        return ['resolved_at' => 'datetime'];
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** Le contenu signalé, masqué ou non */
    public function target(): ?Model
    {
        $class = self::TYPES[$this->reportable_type] ?? null;

        return $class ? $class::withoutGlobalScope('visible')->find($this->reportable_id) : null;
    }
}
