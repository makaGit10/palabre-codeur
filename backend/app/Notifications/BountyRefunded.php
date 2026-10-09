<?php

namespace App\Notifications;

use App\Models\Question;
use App\Notifications\Channels\ResilientMailChannel;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/** Aucune réponse validée à temps : la prime revient dans le portefeuille de l'auteur de la question */
class BountyRefunded extends Notification
{
    public function __construct(private readonly Question $question, private readonly int $amount) {}

    public function via(object $notifiable): array
    {
        return ['database', ResilientMailChannel::class];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $amount = number_format($this->amount, 0, ',', ' ').' FCFA';

        return (new MailMessage)
            ->subject(__('Votre prime de :amount vous a été remboursée', ['amount' => $amount]))
            ->greeting(__('Bonjour :name,', ['name' => $notifiable->name]))
            ->line(__('Aucune réponse n\'a été validée à temps pour « :title ».', ['title' => $this->question->title]))
            ->line(__('La prime de :amount est revenue dans votre portefeuille Palabre. Votre question reste ouverte.', ['amount' => $amount]))
            ->action(__('Voir la question'), rtrim(config('palabre.frontend_url'), '/')."/app/questions/{$this->question->id}")
            ->salutation(__('À bientôt sur Palabre,'));
    }

    public function toArray(object $notifiable): array
    {
        return [
            'kind' => 'refund',
            'amount' => $this->amount,
            'question' => Str::limit($this->question->title, 90),
            'url' => "/app/questions/{$this->question->id}",
        ];
    }
}
