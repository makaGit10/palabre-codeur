<?php

namespace App\Notifications;

use App\Models\Answer;
use App\Models\Question;
use App\Notifications\Channels\ResilientMailChannel;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/** Quelqu'un a répondu à ma question */
class NewAnswer extends Notification
{
    public function __construct(private readonly Answer $answer, private readonly Question $question) {}

    public function via(object $notifiable): array
    {
        return ['database', ResilientMailChannel::class];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $author = $this->answer->author()->value('name');

        return (new MailMessage)
            ->subject(__(':author a répondu à votre question', ['author' => $author]))
            ->greeting(__('Bonjour :name,', ['name' => $notifiable->name]))
            ->line(__(':author vient de répondre à « :title ».', ['author' => $author, 'title' => $this->question->title]))
            ->action(__('Lire la réponse'), rtrim(config('palabre.frontend_url'), '/')."/app/questions/{$this->question->id}")
            ->line(__('Si elle résout votre problème, validez-la : la personne gagne de la réputation, et la prime si vous en avez offert une.'))
            ->salutation(__('À bientôt sur Palabre,'));
    }

    public function toArray(object $notifiable): array
    {
        return [
            'kind' => 'answer',
            'author' => $this->answer->author()->value('name'),
            'question' => Str::limit($this->question->title, 90),
            'url' => "/app/questions/{$this->question->id}",
        ];
    }
}
