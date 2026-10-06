<?php

namespace App\Notifications;

use App\Models\DirectMessage;
use App\Models\User;
use App\Services\MessagingService;
use Illuminate\Notifications\Notification;

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
            'sender' => $this->sender->name,
            'url' => "/app/messages/{$this->sender->id}",
        ] + MessagingService::previewParts($this->message);
    }
}
