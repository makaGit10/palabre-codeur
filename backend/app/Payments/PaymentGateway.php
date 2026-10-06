<?php

namespace App\Payments;

// Contrat avec l'agrégateur de paiement (PayTech, CinetPay…).
// Pendant le concours, SandboxGateway simule les paiements : aucun argent réel ne circule.
interface PaymentGateway
{
    /** Encaisse le montant d'une prime et le bloque. Retourne la référence chez l'agrégateur. */
    public function collect(int $amount, string $method, string $description): string;

    /** Verse un retrait vers le compte du bénéficiaire. Retourne la référence chez l'agrégateur. */
    public function payout(int $amount, string $method, string $account): string;
}
