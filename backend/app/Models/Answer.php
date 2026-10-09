<?php

namespace App\Models;

use App\Models\Concerns\Moderatable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

#[Fillable(['body'])]
class Answer extends Model
{
    use Moderatable;

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function votesCast(): MorphMany
    {
        return $this->morphMany(Vote::class, 'votable');
    }
}
