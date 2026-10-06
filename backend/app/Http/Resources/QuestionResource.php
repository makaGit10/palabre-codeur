<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Résumé d'une question, pour les listes */
class QuestionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'tags' => $this->tags->pluck('name'),
            'author' => new UserResource($this->author),
            'votes' => $this->votes,
            'views' => $this->views,
            'answersCount' => $this->answers_count ?? $this->answers->count(),
            'solved' => $this->accepted_answer_id !== null,
            'bounty' => $this->bounty ? new BountyResource($this->bounty) : null,
            'createdAt' => $this->created_at->toIso8601String(),
        ];
    }
}
