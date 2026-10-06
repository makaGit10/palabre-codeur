<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DirectMessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'mine' => $request->user()?->id === $this->sender_id,
            'attachment' => $this->attachmentPayload(),
            'readAt' => $this->read_at?->toIso8601String(),
            'createdAt' => $this->created_at->toIso8601String(),
        ];
    }
}
