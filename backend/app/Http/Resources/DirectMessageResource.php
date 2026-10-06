<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\SerializesMessage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DirectMessageResource extends JsonResource
{
    use SerializesMessage;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'mine' => $request->user()?->id === $this->sender_id,
            'readAt' => $this->read_at?->toIso8601String(),
        ] + $this->messageFields($request);
    }
}
