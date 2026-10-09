<?php

namespace App\Notifications;

use App\Models\WalletTopup;
use App\Notifications\Channels\ResilientMailChannel;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** De l'argent est arrivé sur le portefeuille (recharge PayTech confirmée) */
class TopupReceived extends Notification
{
    public function __construct(private readonly WalletTopup $topup) {}

    public function via(object $notifiable): array
    {
        return ['database', ResilientMailChannel::class];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $amount = number_format($this->topup->amount, 0, ',', ' ').' FCFA';

        return (new MailMessage)
            ->subject(__(':amount sont arrivés sur votre portefeuille', ['amount' => $amount]))
            ->greeting(__('Bonjour :name,', ['name' => $notifiable->name]))
            ->line(__('Votre recharge de :amount est confirmée : votre portefeuille Palabre est crédité.', ['amount' => $amount]))
            ->line(__('Référence : :ref', ['ref' => $this->topup->reference]))
            ->action(__('Voir mon portefeuille'), rtrim(config('palabre.frontend_url'), '/').'/app/portefeuille')
            ->salutation(__('À bientôt sur Palabre,'));
    }

    public function toArray(object $notifiable): array
    {
        return ['kind' => 'topup', 'amount' => $this->topup->amount, 'url' => '/app/portefeuille'];
    }
}
