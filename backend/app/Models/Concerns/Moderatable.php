<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

/**
 * Contenu masquable par la modération (question, réponse, snippet).
 * Un contenu masqué disparaît de toutes les lectures publiques ; seule l'administration le voit encore
 * (withoutGlobalScope('visible')). Les écritures financières liées ne sont jamais supprimées.
 */
trait Moderatable
{
    protected static function bootModeratable(): void
    {
        static::addGlobalScope('visible', fn (Builder $query) => $query->whereNull($query->qualifyColumn('hidden_at')));
    }

    public function isHidden(): bool
    {
        return $this->hidden_at !== null;
    }
}
