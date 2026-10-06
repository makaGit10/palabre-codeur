<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['text', 'model'])]
class AiSuggestion extends Model
{
    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }

    public function feedback(): HasMany
    {
        return $this->hasMany(AiFeedback::class);
    }
}
