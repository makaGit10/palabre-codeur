<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Profil public : jamais l'e-mail ni le solde du portefeuille */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'country' => $this->country,
            'city' => $this->city,
            'reputation' => $this->reputation,
            'bountyEarnings' => $this->bounty_earnings,
        ];
    }
}
