<?php

use App\Services\BountyRefundService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Primes sans réponse validée après 7 jours : remboursées à l'auteur de la question (idempotent, journalisé)
Artisan::command('palabre:refund-expired-bounties', function (BountyRefundService $refunds) {
    $count = $refunds->refundExpired();
    $this->info($count === 0 ? 'Aucune prime à rembourser.' : "{$count} prime(s) remboursée(s).");
})->purpose('Rembourse les primes expirées sans réponse validée');

// Toutes les 15 minutes, sans chevauchement : un remboursement arrive au plus tard 15 min après l'échéance
Schedule::command('palabre:refund-expired-bounties')->everyFifteenMinutes()->withoutOverlapping();
