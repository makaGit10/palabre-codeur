<?php

namespace App\Notifications;

use App\Models\Question;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/** Ma réponse a été validée (et, le cas échéant, la prime versée) */
class AnswerAccepted extends Notification
{
    public function __construct(private readonly Question $question, private readonly ?int $bountyAmount) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $title = 'Votre réponse a été validée';
        if ($this->bountyAmount) {
            $title .= ' · '.number_format($this->bountyAmount, 0, ',', ' ').' FCFA versés dans votre portefeuille';
        }

        return [
            'kind' => $this->bountyAmount ? 'bounty' : 'accepted',
            'title' => $title,
            'body' => Str::limit($this->question->title, 90),
            'url' => "/app/questions/{$this->question->id}",
        ];
    }
}
