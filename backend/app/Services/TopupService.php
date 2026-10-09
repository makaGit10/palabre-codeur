<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\User;
use App\Models\WalletTopup;
use App\Notifications\TopupReceived;
use App\Payments\PaytechClient;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Recharger son portefeuille avec PayTech (Wave, Orange Money, Free Money, carte…).
 * Le portefeuille n'est crédité qu'à la confirmation de PayTech (IPN), une seule fois, sous verrou.
 * Sans clés PayTech (mode test du concours), la recharge est simulée et créditée tout de suite.
 */
class TopupService
{
    public function __construct(private readonly PaytechClient $paytech) {}

    /** @return array{status: string, redirectUrl: string|null, topup: WalletTopup} */
    public function start(User $user, int $amount): array
    {
        ['min' => $min, 'max' => $max] = config('palabre.paytech.topup');
        if ($amount < $min || $amount > $max) {
            throw new BusinessRuleException(__('Le montant doit être compris entre :min et :max FCFA.', ['min' => number_format($min, 0, ',', ' '), 'max' => number_format($max, 0, ',', ' ')]));
        }

        $topup = new WalletTopup(['amount' => $amount, 'reference' => 'PAL-'.Str::upper(Str::random(12))]);
        $topup->user()->associate($user)->save();

        if (! $this->paytech->configured()) {
            $this->confirm($topup->reference, $amount, 'test', 'TEST-TOPUP-'.Str::upper(Str::random(8)));

            return ['status' => WalletTopup::PAID, 'redirectUrl' => null, 'topup' => $topup->refresh()];
        }

        $payment = $this->paytech->requestPayment($topup);
        $topup->forceFill(['provider_token' => $payment['token']])->save();

        return ['status' => WalletTopup::PENDING, 'redirectUrl' => $payment['redirect_url'], 'topup' => $topup];
    }

    /**
     * Confirmation du paiement (IPN PayTech ou mode test) : crédite le portefeuille une seule fois.
     * Renvoie false si la recharge est inconnue, déjà traitée ou si le montant ne correspond pas.
     */
    public function confirm(string $reference, int $paidAmount, ?string $method, ?string $providerReference): bool
    {
        $credited = DB::transaction(function () use ($reference, $paidAmount, $method, $providerReference) {
            $topup = WalletTopup::where('reference', $reference)->lockForUpdate()->first();
            if (! $topup || $topup->status !== WalletTopup::PENDING || $paidAmount !== $topup->amount) {
                return null;
            }

            $user = User::lockForUpdate()->findOrFail($topup->user_id);
            $topup->forceFill(['status' => WalletTopup::PAID, 'paid_at' => now(), 'payment_method' => $method])->save();
            $user->increment('wallet_balance', $topup->amount);
            $user->walletTransactions()->create([
                'type' => 'topup',
                'amount' => $topup->amount,
                'label' => $method && $method !== 'test' ? $method : '', // le front-end compose « Recharge · … »
                'provider_reference' => $providerReference ?? $reference,
            ]);

            return [$user, $topup];
        });

        if (! $credited) {
            return false;
        }
        [$user, $topup] = $credited;
        $user->notify(new TopupReceived($topup));

        return true;
    }

    public function cancel(string $reference): void
    {
        WalletTopup::where('reference', $reference)->where('status', WalletTopup::PENDING)->update(['status' => WalletTopup::CANCELED]);
    }
}
