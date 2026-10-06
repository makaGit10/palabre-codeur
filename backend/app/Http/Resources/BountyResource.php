<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BountyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'amount' => $this->amount,
            'method' => $this->payment_method,
            'status' => $this->status,
        ];
    }
}
