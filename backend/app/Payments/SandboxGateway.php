<?php

namespace App\Payments;

use Illuminate\Support\Str;

// Paiements simulés (mode test) : chaque opération réussit et reçoit une référence « TEST-… »
class SandboxGateway implements PaymentGateway
{
    public function collect(int $amount, string $method, string $description): string
    {
        return 'TEST-IN-'.Str::upper(Str::random(10));
    }

    public function payout(int $amount, string $method, string $account): string
    {
        return 'TEST-OUT-'.Str::upper(Str::random(10));
    }
}
