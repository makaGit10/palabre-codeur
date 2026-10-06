<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

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
        ];
    }
}
