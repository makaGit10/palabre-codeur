<?php

namespace App\Models\Concerns;

use App\Models\Question;
use App\Models\Snippet;

/** Pièce jointe d'un message : une question ou un extrait de code partagé */
trait HasAttachment
{
    public const ATTACHMENT_QUESTION = 'question';

    public const ATTACHMENT_SNIPPET = 'snippet';

    /** Résout la pièce jointe pour l'API (null si absente ou supprimée depuis) */
    public function attachmentPayload(): ?array
    {
        if (! $this->attachment_type || ! $this->attachment_id) {
            return null;
        }

        if ($this->attachment_type === self::ATTACHMENT_QUESTION) {
            $question = Question::query()->withCount('answers')->find($this->attachment_id);

            return $question ? [
                'type' => 'question',
                'id' => $question->id,
                'title' => $question->title,
                'meta' => $question->answers_count.' '.__($question->answers_count > 1 ? 'réponses' : 'réponse').($question->accepted_answer_id ? ' · '.__('résolue') : ''),
                'url' => "/app/questions/{$question->id}",
            ] : null;
        }

        $snippet = Snippet::query()->find($this->attachment_id);

        return $snippet ? [
            'type' => 'snippet',
            'id' => $snippet->id,
            'title' => $snippet->title,
            'meta' => $snippet->language,
            'url' => '/app/snippets',
            'code' => $snippet->code,
            'fence' => $snippet->fence,
        ] : null;
    }
}
