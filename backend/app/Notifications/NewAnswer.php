<?php

namespace App\Notifications;

use App\Models\Answer;
use App\Models\Question;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/** Quelqu'un a répondu à ma question */
class NewAnswer extends Notification
{
    public function __construct(private readonly Answer $answer, private readonly Question $question) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $author = $this->answer->author()->first();

        return [
            'kind' => 'answer',
            'title' => "{$author->name} a répondu à votre question",
            'body' => Str::limit($this->question->title, 90),
            'url' => "/app/questions/{$this->question->id}",
        ];
    }
}
