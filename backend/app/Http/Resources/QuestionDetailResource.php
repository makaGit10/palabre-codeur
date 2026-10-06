<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

/** Question complète : texte, réponses (validée en premier), suggestion de l'IA */
class QuestionDetailResource extends QuestionResource
{
    public function toArray(Request $request): array
    {
        $suggestion = $this->aiSuggestion;

        return parent::toArray($request) + [
            'body' => $this->body,
            'myVote' => (int) ($this->my_vote ?? 0),
            'answers' => AnswerResource::collection(
                $this->answers->sortBy([
                    fn ($a, $b) => ($b->id === $this->accepted_answer_id) <=> ($a->id === $this->accepted_answer_id),
                    fn ($a, $b) => $b->votes <=> $a->votes,
                ])->values()
            ),
            'aiSuggestion' => $suggestion ? [
                'id' => $suggestion->id,
                'text' => $suggestion->text,
                'feedback' => $suggestion->my_feedback ?? null,
            ] : null,
        ];
    }
}
