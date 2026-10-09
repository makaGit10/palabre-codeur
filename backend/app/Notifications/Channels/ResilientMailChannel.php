<?php

namespace App\Notifications\Channels;

use Illuminate\Notifications\Channels\MailChannel;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Canal e-mail qui ne fait jamais échouer l'action en cours (valider une réponse, retirer de l'argent…) :
 * un serveur de mail indisponible est journalisé, pas propagé.
 */
class ResilientMailChannel extends MailChannel
{
    public function send($notifiable, Notification $notification)
    {
        try {
            return parent::send($notifiable, $notification);
        } catch (Throwable $e) {
            Log::warning('E-mail de notification non envoyé : '.$e->getMessage(), ['notification' => $notification::class]);

            return null;
        }
    }
}
