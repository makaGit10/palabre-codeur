<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Code à 6 chiffres envoyé à l'inscription, valable quelques minutes */
class VerificationCodeMail extends Mailable
{
    use SerializesModels;

    public function __construct(public readonly User $user, public readonly string $code, public readonly int $minutes) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: __('Votre code Palabre : :code', ['code' => $this->code]));
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.verification-code');
    }
}
