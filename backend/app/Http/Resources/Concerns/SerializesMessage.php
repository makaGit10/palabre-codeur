<?php

namespace App\Http\Resources\Concerns;

use App\Models\User;
use Illuminate\Http\Request;

/** Champs communs aux messages de salon et privés : édition, suppression, réactions, droits du lecteur */
trait SerializesMessage
{
    private function messageFields(Request $request): array
    {
        /** @var User|null $viewer */
        $viewer = $request->user('sanctum') ?? $request->user();
        $reactions = $this->relationLoaded('reactions') ? $this->reactions : collect();

        return [
            'body' => $this->body,
            'attachment' => $this->attachmentPayload(),
            'editedAt' => $this->edited_at?->toIso8601String(),
            'deleted' => $this->isDeleted(),
            'reactions' => $reactions
                ->groupBy('emoji')
                ->map(fn ($group, $emoji) => [
                    'emoji' => $emoji,
                    'count' => $group->count(),
                    'mine' => $viewer !== null && $group->contains('user_id', $viewer->id),
                ])
                ->values(),
            'canEdit' => $viewer !== null && $this->canBeEditedBy($viewer),
            'canDelete' => $viewer !== null && $this->canBeDeletedBy($viewer),
            'createdAt' => $this->created_at->toIso8601String(),
        ];
    }
}
