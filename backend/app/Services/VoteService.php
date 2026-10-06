<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\Answer;
use App\Models\Question;
use App\Models\User;
use App\Models\Vote;
use Illuminate\Support\Facades\DB;

class VoteService
{
    /**
     * Enregistre le vote d'une personne : 1 (utile), -1 (pas utile) ou 0 (annuler son vote).
     * Le score de l'élément et la réputation de son auteur sont mis à jour en conséquence.
     */
    public function cast(User $user, Question|Answer $votable, int $value): int
    {
        if ($votable->user_id === $user->id) {
            throw new BusinessRuleException('Vous ne pouvez pas voter pour votre propre contribution.', 403);
        }

        return DB::transaction(function () use ($user, $votable, $value) {
            $existing = Vote::query()
                ->where('user_id', $user->id)
                ->whereMorphedTo('votable', $votable)
                ->lockForUpdate()
                ->first();
            $previous = $existing?->value ?? 0;
            if ($previous === $value) {
                return $votable->votes;
            }

            if ($value === 0) {
                $existing?->delete();
            } else {
                Vote::updateOrCreate(
                    ['user_id' => $user->id, 'votable_type' => $votable->getMorphClass(), 'votable_id' => $votable->getKey()],
                    ['value' => $value],
                );
            }

            $votable->increment('votes', $value - $previous);
            $delta = $this->reputationFor($votable, $value) - $this->reputationFor($votable, $previous);
            if ($delta !== 0) {
                // La réputation ne descend jamais sous 1
                User::whereKey($votable->user_id)->update(['reputation' => DB::raw("GREATEST(1, reputation + ({$delta}))")]);
            }

            return $votable->refresh()->votes;
        });
    }

    private function reputationFor(Question|Answer $votable, int $value): int
    {
        $rep = config('palabre.reputation');

        return match (true) {
            $value === 1 && $votable instanceof Answer => $rep['answer_upvoted'],
            $value === 1 => $rep['question_upvoted'],
            $value === -1 => $rep['downvoted'],
            default => 0,
        };
    }
}
