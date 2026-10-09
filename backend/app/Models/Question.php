<?php

namespace App\Models;

use App\Models\Concerns\Moderatable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;

#[Fillable(['title', 'body'])]
class Question extends Model
{
    use Moderatable;

    protected function casts(): array
    {
        return ['edited_at' => 'datetime'];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(Answer::class);
    }

    public function acceptedAnswer(): BelongsTo
    {
        return $this->belongsTo(Answer::class, 'accepted_answer_id');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }

    public function bounty(): HasOne
    {
        return $this->hasOne(Bounty::class);
    }

    public function aiSuggestion(): HasOne
    {
        return $this->hasOne(AiSuggestion::class);
    }

    public function votesCast(): MorphMany
    {
        return $this->morphMany(Vote::class, 'votable');
    }

    public function isSolved(): bool
    {
        return $this->accepted_answer_id !== null;
    }
}
