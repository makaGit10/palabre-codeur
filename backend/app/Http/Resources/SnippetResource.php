<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

class SnippetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'language' => $this->language,
            'fence' => $this->fence,
            'tags' => $this->apis,
            'author' => new UserResource($this->author),
            'testedBy' => $this->testers_count ?? 0,
            'testedByMe' => (bool) ($this->tested_by_me ?? false),
            'votes' => $this->votes,
            'code' => $this->code,
            // Passeport : « testé » est une déclaration des membres ; aucun test automatisé n'est exécuté sur les extraits
            'passport' => [
                'apiVersion' => $this->api_version,
                'requirements' => $this->requirements,
                'environment' => $this->environment,
                'license' => $this->license ?? 'MIT',
                'limitations' => $this->limitations,
                'lastVerifiedAt' => $this->last_verified_at ? Carbon::parse($this->last_verified_at)->toIso8601String() : null,
                'automatedTest' => false,
            ],
        ];
    }
}
