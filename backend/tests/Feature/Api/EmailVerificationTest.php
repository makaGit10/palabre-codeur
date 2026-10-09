<?php

namespace Tests\Feature\Api;

use App\Mail\VerificationCodeMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    // Requêtes envoyées comme par le front-end (même origine), pour activer la session Sanctum
    private function spa(): static
    {
        return $this->withHeaders(['Origin' => 'http://localhost:5180', 'Referer' => 'http://localhost:5180/']);
    }

    private function register(string $email = 'awa@exemple.com'): string
    {
        $this->spa()->postJson('/api/register', [
            'name' => 'Awa Koné',
            'email' => $email,
            'password' => 'motdepasse2026',
            'country' => 'CI',
            'city' => 'Abidjan',
        ])->assertCreated()->assertJsonPath('data.emailVerified', false);

        $code = null;
        Mail::assertSent(VerificationCodeMail::class, function (VerificationCodeMail $mail) use (&$code, $email) {
            $code = $mail->code;

            return $mail->hasTo($email) && preg_match('/^\d{6}$/', $mail->code) === 1;
        });

        return $code;
    }

    private function question(): array
    {
        return ['title' => 'Webhook Orange Money jamais appelé en production', 'body' => str_repeat('Mon endpoint ne reçoit rien, les logs sont vides. ', 4), 'tags' => ['orange-money']];
    }

    public function test_registration_sends_a_six_digit_code_and_verifying_it_unlocks_participation(): void
    {
        Mail::fake();
        $code = $this->register();

        // Participer sans adresse vérifiée est refusé, lire reste possible
        $this->spa()->postJson('/api/questions', $this->question())->assertForbidden()->assertJsonPath('code', 'email_unverified');
        $this->spa()->getJson('/api/questions')->assertOk();

        $wrong = $code === '000000' ? '111111' : '000000';
        $this->spa()->postJson('/api/email/verification/verify', ['code' => $wrong])->assertUnprocessable()->assertJsonPath('message', 'Code incorrect.');
        $this->spa()->postJson('/api/email/verification/verify', ['code' => $code])->assertOk()->assertJsonPath('data.emailVerified', true);
        $this->spa()->postJson('/api/questions', $this->question())->assertCreated();
    }

    public function test_the_code_expires_after_two_minutes_and_a_new_one_can_be_sent(): void
    {
        Mail::fake();
        $code = $this->register();

        $this->travel(3)->minutes();
        $this->spa()->postJson('/api/email/verification/verify', ['code' => $code])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Ce code a expiré. Demandez-en un nouveau.');

        $this->spa()->postJson('/api/email/verification/send')->assertOk();
        Mail::assertSent(VerificationCodeMail::class, 2);
    }

    public function test_five_wrong_codes_burn_the_code(): void
    {
        Mail::fake();
        $code = $this->register();
        $wrong = $code === '000000' ? '111111' : '000000';

        foreach (range(1, 4) as $i) {
            $this->spa()->postJson('/api/email/verification/verify', ['code' => $wrong])->assertUnprocessable();
        }
        $this->spa()->postJson('/api/email/verification/verify', ['code' => $wrong])->assertJsonPath('message', "Trop d'essais. Demandez un nouveau code.");
        // Même le bon code ne passe plus : il faut en demander un autre
        $this->spa()->postJson('/api/email/verification/verify', ['code' => $code])->assertJsonPath('message', 'Ce code a expiré. Demandez-en un nouveau.');
    }

    public function test_verification_can_be_switched_off_for_a_demo_without_mail_server(): void
    {
        Mail::fake();
        config(['palabre.features.email_verification' => false]);

        $this->spa()->postJson('/api/register', ['name' => 'Awa Koné', 'email' => 'awa@exemple.com', 'password' => 'motdepasse2026', 'country' => 'CI'])
            ->assertCreated()
            ->assertJsonPath('data.emailVerified', true);
        Mail::assertNothingSent();
        $this->spa()->postJson('/api/questions', $this->question())->assertCreated();
    }
}
