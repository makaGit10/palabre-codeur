<?php

namespace App\Models\Concerns;

use App\Models\MessageReaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Règles communes aux messages de salon et privés : qui peut modifier, qui peut supprimer, pendant combien de temps.
 * Les fenêtres sont dans config/palabre.php (messages.edit_window_minutes, messages.delete_window_hours).
 */
trait IsMessage
{
    public function reactions(): MorphMany
    {
        return $this->morphMany(MessageReaction::class, 'reactable');
    }

    /** Colonne de l'auteur : user_id pour un salon, sender_id pour un message privé */
    public function authorId(): int
    {
        return (int) ($this->sender_id ?? $this->user_id);
    }

    public function isDeleted(): bool
    {
        return $this->deleted_at !== null;
    }

    /** Modifiable par son auteur, pendant la fenêtre d'édition, tant qu'il n'est pas supprimé */
    public function canBeEditedBy(User $user): bool
    {
        return ! $this->isDeleted()
            && $this->authorId() === $user->id
            && $this->created_at->gt(now()->subMinutes(config('palabre.messages.edit_window_minutes')));
    }

    /** Supprimable pour tout le monde par son auteur, pendant la fenêtre de suppression */
    public function canBeDeletedBy(User $user): bool
    {
        return ! $this->isDeleted()
            && $this->authorId() === $user->id
            && $this->created_at->gt(now()->subHours(config('palabre.messages.delete_window_hours')));
    }
}
