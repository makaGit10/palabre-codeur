<?php

namespace App\Console\Commands;

use App\Models\Bounty;
use App\Models\User;
use App\Services\QuestionService;
use Illuminate\Console\Command;
use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;

/**
 * Vérification de concurrence réelle contre un serveur en marche (local ou en ligne) :
 * des requêtes simultanées tentent de verser deux fois une prime, de retirer deux fois le même argent,
 * et de valider une réponse pendant que le remboursement automatique tourne.
 * Les comptes et contenus créés pour l'essai sont supprimés à la fin. N'utilise que le mode test des paiements.
 */
class ConcurrencyCheck extends Command
{
    protected $signature = 'palabre:concurrency-check {--url= : adresse de l\'API (par défaut APP_URL)} {--parallel=8}';

    protected $description = 'Envoie des requêtes simultanées pour vérifier qu\'aucun argent n\'est versé ou retiré deux fois';

    private array $created = [];

    public function handle(QuestionService $questions): int
    {
        $base = rtrim($this->option('url') ?: config('app.url'), '/').'/api';
        $n = (int) $this->option('parallel');
        $ok = true;

        try {
            // 1. Validation simultanée de la même réponse : la prime ne doit être versée qu'une fois
            [$asker, $helper] = [$this->user(), $this->user()];
            $question = $questions->create($asker, ['title' => 'Essai de concurrence '.Str::random(6), 'body' => 'Essai automatique.', 'tags' => ['essai'], 'bounty' => ['amount' => 1000, 'method' => 'wave']]);
            $answer = $questions->answer($question, $helper, 'Réponse d\'essai.');
            $codes = $this->burst($n, $asker, 'post', "{$base}/questions/{$question->id}/answers/{$answer->id}/accept");
            $helper->refresh();
            $ok &= $this->report('Validation simultanée ×'.$n, $codes, 1, $helper->wallet_balance === 1000 && $helper->walletTransactions()->where('type', 'bounty_received')->count() === 1, "solde du bénéficiaire {$helper->wallet_balance} FCFA");

            // 2. Retraits simultanés : 1 500 FCFA de solde, plusieurs retraits de 1 000 → un seul passe
            $rich = $this->user();
            $rich->forceFill(['wallet_balance' => 1500])->save();
            $codes = $this->burst($n, $rich, 'post', "{$base}/wallet/withdrawals", ['amount' => 1000, 'method' => 'wave', 'account' => '77 123 45 67']);
            $rich->refresh();
            $ok &= $this->report('Retraits simultanés ×'.$n, $codes, 1, $rich->wallet_balance === 500 && $rich->walletTransactions()->where('type', 'withdrawal')->count() === 1, "solde restant {$rich->wallet_balance} FCFA");

            // 3. Validation pendant le remboursement automatique d'une prime expirée : versée OU remboursée, jamais les deux
            [$asker2, $helper2] = [$this->user(), $this->user()];
            $q2 = $questions->create($asker2, ['title' => 'Essai remboursement '.Str::random(6), 'body' => 'Essai automatique.', 'tags' => ['essai'], 'bounty' => ['amount' => 2000, 'method' => 'wave']]);
            $a2 = $questions->answer($q2, $helper2, 'Réponse d\'essai.');
            $q2->bounty()->update(['expires_at' => now()->subMinute()]);
            $refund = new Process(['php', 'artisan', 'palabre:refund-expired-bounties'], base_path());
            $refund->start();
            $codes = $this->burst($n, $asker2, 'post', "{$base}/questions/{$q2->id}/answers/{$a2->id}/accept");
            $refund->wait();
            [$asker2, $helper2] = [$asker2->fresh(), $helper2->fresh()];
            $status = $q2->bounty()->value('status');
            $paidOnce = $status === Bounty::PAID && $helper2->wallet_balance === 2000 && $asker2->wallet_balance === 0;
            $refundedOnce = $status === Bounty::REFUNDED && $helper2->wallet_balance === 0 && $asker2->wallet_balance === 2000;
            $ok &= $this->report('Validation contre remboursement', $codes, null, ($paidOnce || $refundedOnce) && $asker2->wallet_held === 0, "prime {$status}, bénéficiaire {$helper2->wallet_balance}, auteur {$asker2->wallet_balance} FCFA");
        } finally {
            User::whereIn('id', $this->created)->each(fn (User $u) => $u->delete());
        }

        $this->newLine();
        $ok ? $this->info('Aucune incohérence : rien n\'a été versé ni retiré deux fois.') : $this->error('Incohérence détectée : voir ci-dessus.');

        return $ok ? self::SUCCESS : self::FAILURE;
    }

    private function user(): User
    {
        // Pas de factory : la commande doit aussi tourner en production, où les outils de test ne sont pas installés
        $user = User::create(['name' => 'Essai concurrence', 'email' => 'concurrence-'.Str::lower(Str::random(10)).'@palabre.test', 'password' => Str::random(32), 'country' => 'SN']);
        $user->forceFill(['email_verified_at' => now()])->save();
        $this->created[] = $user->id;

        return $user;
    }

    /** @return list<int> codes HTTP des requêtes envoyées en même temps */
    private function burst(int $n, User $as, string $method, string $url, array $body = []): array
    {
        $token = $as->createToken('concurrence')->plainTextToken;
        $responses = Http::pool(fn (Pool $pool) => array_map(
            fn () => $pool->withToken($token)->acceptJson()->timeout(30)->{$method}($url, $body),
            range(1, $n),
        ));

        return array_map(fn ($r) => $r instanceof \Throwable ? 0 : $r->status(), $responses);
    }

    private function report(string $label, array $codes, ?int $expectedSuccesses, bool $consistent, string $detail): bool
    {
        $successes = count(array_filter($codes, fn ($c) => $c >= 200 && $c < 300));
        $pass = $consistent && ($expectedSuccesses === null || $successes === $expectedSuccesses);
        $this->line(sprintf('%s %s : %d réussite(s) sur %d, %s', $pass ? '<info>✓</info>' : '<error>✗</error>', $label, $successes, count($codes), $detail));

        return $pass;
    }
}
