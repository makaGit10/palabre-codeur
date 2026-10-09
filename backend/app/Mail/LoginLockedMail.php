<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Alerte : trop de mots de passe faux, les connexions au compte sont bloquées un moment */
class LoginLockedMail extends Mailable
{
    use SerializesModels;

    public function __construct(public readonly User $user, public readonly string $ip, public readonly int $minutes, public readonly int $attempts) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: __('Palabre : connexions bloquées pendant :minutes minutes', ['minutes' => $this->minutes]));
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.login-locked', with: [
            'when' => now()->translatedFormat('j F Y, H:i'),
            'resetUrl' => rtrim(config('palabre.frontend_url'), '/').'/mot-de-passe-oublie',
        ]);
    }
}
