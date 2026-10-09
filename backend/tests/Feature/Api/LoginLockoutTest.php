<?php

namespace Tests\Feature\Api;

use App\Mail\LoginLockedMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class LoginLockoutTest extends TestCase
{
    use RefreshDatabase;

    private function spa(): static
    {
        return $this->withHeaders(['Origin' => 'http://localhost:5180', 'Referer' => 'http://localhost:5180/']);
    }

    public function test_five_failed_logins_lock_the_account_for_thirty_minutes_and_send_an_alert(): void
    {
        Mail::fake();
        $this->withoutMiddleware(ThrottleRequests::class); // on teste le blocage du compte, pas la limite par minute
        User::factory()->create(['email' => 'mareme@exemple.com', 'password' => 'secret123']);

        foreach (range(1, 5) as $attempt) {
            $this->spa()->postJson('/api/login', ['email' => 'mareme@exemple.com', 'password' => 'faux'])->assertUnprocessable();
        }
        Mail::assertSent(LoginLockedMail::class, fn (LoginLockedMail $mail) => $mail->hasTo('mareme@exemple.com') && $mail->minutes === 30 && $mail->attempts === 5);

        // Même le bon mot de passe est refusé pendant le blocage
        $this->spa()->postJson('/api/login', ['email' => 'mareme@exemple.com', 'password' => 'secret123'])
            ->assertStatus(423)
            ->assertJsonPath('message', 'Trop de tentatives : les connexions à ce compte sont bloquées encore 30 min.');

        $this->travel(31)->minutes();
        $this->spa()->postJson('/api/login', ['email' => 'mareme@exemple.com', 'password' => 'secret123'])->assertOk();
    }

    public function test_a_successful_login_resets_the_failure_counter(): void
    {
        Mail::fake();
        $this->withoutMiddleware(ThrottleRequests::class);
        User::factory()->create(['email' => 'mareme@exemple.com', 'password' => 'secret123']);

        foreach (range(1, 4) as $attempt) {
            $this->spa()->postJson('/api/login', ['email' => 'mareme@exemple.com', 'password' => 'faux'])->assertUnprocessable();
        }
        $this->spa()->postJson('/api/login', ['email' => 'mareme@exemple.com', 'password' => 'secret123'])->assertOk();
        $this->spa()->postJson('/api/logout')->assertOk();
        $this->app['auth']->forgetGuards();

        // Le compteur est reparti de zéro : quatre nouveaux échecs ne bloquent pas
        foreach (range(1, 4) as $attempt) {
            $this->spa()->postJson('/api/login', ['email' => 'mareme@exemple.com', 'password' => 'faux'])->assertUnprocessable();
        }
        Mail::assertNotSent(LoginLockedMail::class);
    }
}
