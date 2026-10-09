<?php

namespace App\Notifications;

use App\Models\WalletTransaction;
use App\Notifications\Channels\ResilientMailChannel;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Confirmation par e-mail d'un retrait du portefeuille (l'historique de l'application l'affiche déjà) */
class WithdrawalMade extends Notification
{
    public function __construct(private readonly WalletTransaction $transaction) {}

    public function via(object $notifiable): array
    {
        return [ResilientMailChannel::class];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $tx = $this->transaction;
        $amount = number_format($tx->amount, 0, ',', ' ').' FCFA';
        $method = config("palabre.payment_labels.{$tx->payment_method}", $tx->payment_method);

        return (new MailMessage)
            ->subject(__('Retrait de :amount confirmé', ['amount' => $amount]))
            ->greeting(__('Bonjour :name,', ['name' => $notifiable->name]))
            ->line(__('Votre retrait de :amount vers :method :account a bien été enregistré.', ['amount' => $amount, 'method' => $method, 'account' => $tx->account_masked ?? '']))
            ->line(__('Référence : :ref', ['ref' => $tx->provider_reference]))
            ->action(__('Voir mon portefeuille'), rtrim(config('palabre.frontend_url'), '/').'/app/portefeuille')
            ->line(__("Si vous n'êtes pas à l'origine de ce retrait, changez votre mot de passe immédiatement."))
            ->salutation(__('À bientôt sur Palabre,'));
    }
}
