<?php

use App\Models\User;
use App\Services\BountyRefundService;
use App\Services\Live\LiveBroadcaster;
use App\Services\MemberService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Primes sans réponse validée après 7 jours : remboursées à l'auteur de la question (idempotent, journalisé)
Artisan::command('palabre:refund-expired-bounties', function (BountyRefundService $refunds, LiveBroadcaster $live) {
    $count = $refunds->refundExpired();
    if ($count > 0) {
        $live->changed(['questions', 'wallet']);
    }
    $this->info($count === 0 ? 'Aucune prime à rembourser.' : "{$count} prime(s) remboursée(s).");
})->purpose('Rembourse les primes expirées sans réponse validée');

// Toutes les 15 minutes, sans chevauchement : un remboursement arrive au plus tard 15 min après l'échéance
Schedule::command('palabre:refund-expired-bounties')->everyFifteenMinutes()->withoutOverlapping();

// Donner ou retirer le rôle d'administrateur (modération) : seulement depuis le serveur, jamais par l'API
Artisan::command('palabre:admin {email} {--role=admin : admin, moderator ou member} {--remove : équivaut à --role=member}', function (string $email) {
    $user = User::where('email', mb_strtolower($email))->first();
    if (! $user) {
        $this->error("Aucun compte avec l'adresse {$email}.");

        return 1;
    }
    $role = $this->option('remove') ? 'member' : $this->option('role');
    if (! in_array($role, MemberService::ROLES, true)) {
        $this->error('Rôle inconnu : admin, moderator ou member.');

        return 1;
    }
    $user->forceFill(['is_admin' => $role === 'admin', 'is_moderator' => $role === 'moderator'])->save();
    $this->info("{$user->name} : rôle {$role}.");
})->purpose('Donne un rôle (admin, moderator, member) depuis le serveur');
