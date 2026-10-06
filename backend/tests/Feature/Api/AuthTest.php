<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    // Requêtes envoyées comme par le front-end (même origine), pour activer la session Sanctum
    private function spa(): static
    {
        return $this->withHeaders(['Origin' => 'http://localhost:5180', 'Referer' => 'http://localhost:5180/']);
    }

    public function test_someone_can_register_and_is_logged_in(): void
    {
        $this->spa()->postJson('/api/register', [
            'name' => 'Awa Koné',
            'email' => 'Awa@Exemple.com',
            'password' => 'motdepasse2026',
            'country' => 'CI',
            'city' => 'Abidjan',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Awa Koné')
            ->assertJsonPath('data.email', 'awa@exemple.com')
            ->assertJsonPath('data.country', 'CI')
            // Un nouveau compte commence avec 1 point et 0 FCFA (jamais null : l'interface en dépend)
            ->assertJsonPath('data.reputation', 1)
            ->assertJsonPath('data.bountyEarnings', 0);

        $this->spa()->getJson('/api/me')->assertOk()->assertJsonPath('data.email', 'awa@exemple.com');
    }

    public function test_registration_requires_a_supported_country_and_a_strong_password(): void
    {
        $this->spa()->postJson('/api/register', [
            'name' => 'Test',
            'email' => 'test@exemple.com',
            'password' => 'court',
            'country' => 'FR',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['password', 'country']);
    }

    public function test_login_with_a_wrong_password_gives_a_generic_message(): void
    {
        User::factory()->create(['email' => 'marememakalou10@gmail.com']);

        $this->spa()->postJson('/api/login', ['email' => 'marememakalou10@gmail.com', 'password' => 'faux'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.email.0', 'Adresse e-mail ou mot de passe incorrect.');
    }

    public function test_login_then_logout(): void
    {
        User::factory()->create(['email' => 'marememakalou10@gmail.com', 'password' => 'secret123']);

        $this->spa()->postJson('/api/login', ['email' => 'MareMeMakalou10@gmail.com', 'password' => 'secret123'])->assertOk();
        $this->spa()->postJson('/api/logout')->assertOk();
        $this->app['auth']->forgetGuards();
        $this->spa()->getJson('/api/me')->assertUnauthorized();
    }

    public function test_login_attempts_are_limited(): void
    {
        foreach (range(1, 5) as $attempt) {
            $this->spa()->postJson('/api/login', ['email' => 'x@exemple.com', 'password' => 'faux'])->assertUnprocessable();
        }
        $this->spa()->postJson('/api/login', ['email' => 'x@exemple.com', 'password' => 'faux'])->assertTooManyRequests();
    }
}
