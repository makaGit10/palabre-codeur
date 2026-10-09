<?php

namespace App\Notifications;

use App\Models\Question;
use App\Notifications\Channels\ResilientMailChannel;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/** Ma réponse a été validée (et, le cas échéant, la prime versée) */
class AnswerAccepted extends Notification
{
    public function __construct(private readonly Question $question, private readonly ?int $bountyAmount) {}

    public function via(object $notifiable): array
    {
        return ['database', ResilientMailChannel::class];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $front = rtrim(config('palabre.frontend_url'), '/');
        $mail = (new MailMessage)->greeting(__('Bonjour :name,', ['name' => $notifiable->name]));

        if ($this->bountyAmount) {
            $amount = number_format($this->bountyAmount, 0, ',', ' ').' FCFA';

            return $mail->subject(__('Votre réponse a été validée : :amount versés', ['amount' => $amount]))
                ->line(__('Votre réponse à « :title » a été validée.', ['title' => $this->question->title]))
                ->line(__("La prime de :amount vient d'arriver dans votre portefeuille Palabre. Vous pouvez la retirer quand vous voulez.", ['amount' => $amount]))
                ->action(__('Voir mon portefeuille'), $front.'/app/portefeuille')
                ->salutation(__('À bientôt sur Palabre,'));
        }

        return $mail->subject(__('Votre réponse a été validée'))
            ->line(__("Votre réponse à « :title » a été validée : merci d'avoir aidé !", ['title' => $this->question->title]))
            ->action(__('Voir la question'), $front."/app/questions/{$this->question->id}")
            ->salutation(__('À bientôt sur Palabre,'));
    }

    public function toArray(object $notifiable): array
    {
        return [
            'kind' => $this->bountyAmount ? 'bounty' : 'accepted',
            'amount' => $this->bountyAmount,
            'question' => Str::limit($this->question->title, 90),
            'url' => "/app/questions/{$this->question->id}",
        ];
    }
}
