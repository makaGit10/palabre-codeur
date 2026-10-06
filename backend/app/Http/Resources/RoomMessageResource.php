<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\SerializesMessage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoomMessageResource extends JsonResource
{
    use SerializesMessage;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'author' => new UserResource($this->author),
        ] + $this->messageFields($request);
    }
}
