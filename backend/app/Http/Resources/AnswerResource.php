<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AnswerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'author' => new UserResource($this->author),
            'body' => $this->body,
            'votes' => $this->votes,
            'myVote' => (int) ($this->my_vote ?? 0),
            'accepted' => $this->id === $this->question->accepted_answer_id,
            'createdAt' => $this->created_at->toIso8601String(),
            'editedAt' => $this->edited_at?->toIso8601String(),
        ];
    }
}
