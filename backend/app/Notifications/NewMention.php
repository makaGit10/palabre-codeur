<?php

namespace App\Notifications;

use App\Models\Room;
use App\Models\RoomMessage;
use App\Models\User;
use App\Services\MessagingService;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/** Quelqu'un m'a mentionné avec @ dans un salon ou un groupe */
class NewMention extends Notification
{
    public function __construct(private readonly User $author, private readonly Room $room, private readonly RoomMessage $message) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'kind' => 'mention',
            'title' => "{$this->author->name} vous a mentionné dans {$this->room->name}",
            'body' => Str::limit(MessagingService::preview($this->message), 90),
            'url' => "/app/salons/{$this->room->slug}",
        ];
    }
}
