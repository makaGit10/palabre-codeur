<?php

namespace App\Services;

use App\Models\Bounty;
use App\Models\Question;
use App\Models\User;
use App\Notifications\BountyRefunded;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Remboursement des primes non attribuées : après N jours sans réponse validée, la prime bloquée
 * revient dans le portefeuille de l'auteur de la question.
 *
 * Sûreté : chaque prime est traitée dans sa propre transaction, avec les mêmes verrous et dans le même ordre
 * que la validation d'une réponse (question, puis prime, puis personne). Une prime déjà versée, déjà remboursée
 * ou dont la question vient d'être résolue est ignorée : relancer le traitement ne rembourse jamais deux fois.
 */
class BountyRefundService
{
    /** @return int nombre de primes remboursées */
    public function refundExpired(): int
    {
        $ids = Bounty::where('status', Bounty::HELD)->where('expires_at', '<=', now())->orderBy('id')->pluck('id');

        return $ids->filter(fn (int $id) => $this->refund($id))->count();
    }

    public function refund(int $bountyId): bool
    {
        $refunded = DB::transaction(function () use ($bountyId) {
            $questionId = Bounty::whereKey($bountyId)->value('question_id');
            // Une question masquée par la modération est quand même remboursée : l'argent ne reste jamais bloqué
            if (! $questionId) {
                return null;
            }
            $question = Question::withoutGlobalScope('visible')->lockForUpdate()->find($questionId);
            $bounty = Bounty::lockForUpdate()->find($bountyId);
            if (! $question || ! $bounty || $bounty->status !== Bounty::HELD || $question->isSolved() || $bounty->expires_at->isFuture()) {
                return null;
            }

            $owner = User::lockForUpdate()->findOrFail($question->user_id);
            $bounty->forceFill(['status' => Bounty::REFUNDED])->save();
            $owner->forceFill([
                'wallet_held' => max(0, $owner->wallet_held - $bounty->amount),
                'wallet_balance' => $owner->wallet_balance + $bounty->amount,
            ])->save();
            $owner->walletTransactions()->create([
                'type' => 'bounty_refunded',
                'amount' => $bounty->amount,
                'label' => $question->title, // le front-end compose « Prime remboursée · … »
                'payment_method' => $bounty->payment_method,
            ]);

            return [$owner, $question, $bounty];
        });

        if (! $refunded) {
            return false;
        }
        [$owner, $question, $bounty] = $refunded;
        Log::info('Prime remboursée', ['bounty' => $bounty->id, 'question' => $question->id, 'amount' => $bounty->amount]);
        $owner->notify(new BountyRefunded($question, $bounty->amount));

        return true;
    }
}
