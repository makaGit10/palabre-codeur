<?php

namespace App\Notifications;

use App\Models\DirectMessage;
use App\Models\User;
use App\Services\MessagingService;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/** Nouveau message privé */
class NewDirectMessage extends Notification
{
    public function __construct(private readonly DirectMessage $message, private readonly User $sender) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'kind' => 'message',
            'title' => "Nouveau message de {$this->sender->name}",
            'body' => Str::limit(MessagingService::preview($this->message), 90),
            'url' => "/app/messages/{$this->sender->id}",
        ];
    }
}
