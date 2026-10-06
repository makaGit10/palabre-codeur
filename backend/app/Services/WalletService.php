<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Payments\PaymentGateway;
use Illuminate\Support\Facades\DB;

class WalletService
{
    public function __construct(private readonly PaymentGateway $payments) {}

    /**
     * Retire des gains vers un moyen disponible dans le pays de la personne.
     * Le solde est verrouillé pendant l'opération : impossible de retirer deux fois le même argent.
     */
    public function withdraw(User $user, int $amount, string $method, ?string $account): WalletTransaction
    {
        if (! in_array($method, config("palabre.countries.{$user->country}.methods", []), true)) {
            throw new BusinessRuleException(__("Ce moyen de retrait n'est pas disponible dans votre pays."));
        }
        $min = config('palabre.wallet.min_withdrawal');
        if ($amount < $min) {
            throw new BusinessRuleException(__('Le retrait minimum est de :min FCFA.', ['min' => $min]));
        }

        return DB::transaction(function () use ($user, $amount, $method, $account) {
            $locked = User::lockForUpdate()->findOrFail($user->id);
            if ($amount > $locked->wallet_balance) {
                throw new BusinessRuleException(__('Le montant dépasse votre solde disponible.'));
            }

            $reference = $this->payments->payout($amount, $method, (string) $account);
            $locked->decrement('wallet_balance', $amount);

            return $locked->walletTransactions()->create([
                'type' => 'withdrawal',
                'amount' => $amount,
                'label' => $account ? self::mask($account) : '', // numéro masqué ; vide pour la carte enregistrée (libellé composé par le front-end)
                'payment_method' => $method,
                'account_masked' => $account ? self::mask($account) : null,
                'provider_reference' => $reference,
            ]);
        });
    }

    // On ne garde jamais le numéro ou le RIB complet : seulement les 4 derniers caractères
    public static function mask(string $account): string
    {
        $clean = preg_replace('/\s+/', '', $account);

        return '•••• '.substr($clean, -4);
    }
}
