<?php

namespace App\Models;

use App\Models\Concerns\Moderatable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['title', 'description', 'language', 'fence', 'apis', 'code', 'api_version', 'requirements', 'environment', 'license', 'limitations'])]
class Snippet extends Model
{
    use Moderatable;

    protected function casts(): array
    {
        return ['apis' => 'array'];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // Développeurs ayant confirmé « Je l'ai testé »
    public function testers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'snippet_tests')->withTimestamps();
    }
}
