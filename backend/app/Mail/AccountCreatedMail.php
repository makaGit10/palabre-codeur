<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Invitation envoyée quand un administrateur crée un compte au nom de quelqu'un */
class AccountCreatedMail extends Mailable
{
    use SerializesModels;

    public function __construct(public readonly User $user, public readonly User $creator, public readonly string $role) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: __('Votre compte Palabre est prêt'));
    }

    public function content(): Content
    {
        $roles = ['member' => __('membre'), 'moderator' => __('modérateur'), 'admin' => __('administrateur')];

        return new Content(markdown: 'mail.account-created', with: [
            'roleLabel' => $roles[$this->role] ?? $this->role,
            'resetUrl' => rtrim(config('palabre.frontend_url'), '/').'/mot-de-passe-oublie?email='.urlencode($this->user->email),
        ]);
    }
}
