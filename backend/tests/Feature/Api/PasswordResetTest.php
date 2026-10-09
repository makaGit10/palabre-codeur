<?php

namespace Tests\Feature\Api;

use App\Mail\PasswordResetCodeMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private function spa(): static
    {
        return $this->withHeaders(['Origin' => 'http://localhost:5180', 'Referer' => 'http://localhost:5180/']);
    }

    public function test_a_forgotten_password_is_reset_with_the_emailed_code(): void
    {
        Mail::fake();
        User::factory()->create(['email' => 'mareme@exemple.com', 'password' => 'ancien123']);

        // Adresse inconnue : même réponse, aucun e-mail (on ne révèle pas qui est inscrit)
        $this->spa()->postJson('/api/password/forgot', ['email' => 'inconnu@exemple.com'])->assertOk();
        Mail::assertNothingSent();

        $this->spa()->postJson('/api/password/forgot', ['email' => 'Mareme@exemple.com'])->assertOk();
        $code = null;
        Mail::assertSent(PasswordResetCodeMail::class, function (PasswordResetCodeMail $mail) use (&$code) {
            $code = $mail->code;

            return $mail->hasTo('mareme@exemple.com') && $mail->minutes === 10;
        });

        $this->spa()->postJson('/api/password/reset', ['email' => 'mareme@exemple.com', 'code' => $code, 'password' => 'court'])
            ->assertUnprocessable()->assertJsonValidationErrors(['password']);
        $this->spa()->postJson('/api/password/reset', ['email' => 'mareme@exemple.com', 'code' => $code, 'password' => 'nouveau2026'])
            ->assertOk()->assertJsonPath('data.email', 'mareme@exemple.com');

        $this->spa()->postJson('/api/logout')->assertOk();
        $this->app['auth']->forgetGuards();
        $this->spa()->postJson('/api/login', ['email' => 'mareme@exemple.com', 'password' => 'nouveau2026'])->assertOk();

        // Le code ne sert qu'une fois
        $this->spa()->postJson('/api/password/reset', ['email' => 'mareme@exemple.com', 'code' => $code, 'password' => 'autre2026'])
            ->assertUnprocessable()->assertJsonPath('message', 'Ce code a expiré. Demandez-en un nouveau.');
    }
}
