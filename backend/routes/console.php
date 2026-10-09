<?php

use App\Models\User;
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

// Donner ou retirer le rôle d'administrateur (modération) : seulement depuis le serveur, jamais par l'API
Artisan::command('palabre:admin {email} {--remove}', function (string $email) {
    $user = User::where('email', mb_strtolower($email))->first();
    if (! $user) {
        $this->error("Aucun compte avec l'adresse {$email}.");

        return 1;
    }
    $user->forceFill(['is_admin' => ! $this->option('remove')])->save();
    $this->info($user->is_admin ? "{$user->name} est administrateur." : "{$user->name} n'est plus administrateur.");
})->purpose('Donne (ou retire avec --remove) le rôle administrateur');
