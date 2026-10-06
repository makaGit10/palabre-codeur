<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoAccountsTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_accounts_are_hidden_unless_enabled(): void
    {
        config(['palabre.demo.accounts_public' => false]);
        User::factory()->create(['email' => 'moussa@palabre.test']);

        $this->getJson('/api/demo-accounts')->assertNotFound();
    }

    public function test_demo_accounts_are_listed_with_the_shared_password_when_enabled(): void
    {
        config([
            'palabre.demo.accounts_public' => true,
            'palabre.demo.password' => 'jury-2026',
            'palabre.demo.public_accounts' => ['moussa@palabre.test', 'yasmine@palabre.test'],
        ]);
        User::factory()->create(['name' => 'Yasmine Benali', 'email' => 'yasmine@palabre.test', 'country' => 'MA']);
        User::factory()->create(['name' => 'Moussa Diop', 'email' => 'moussa@palabre.test', 'country' => 'SN']);
        User::factory()->create(['email' => 'marememakalou10@gmail.com']);

        $this->getJson('/api/demo-accounts')->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.email', 'moussa@palabre.test') // ordre de la configuration, pas de la base
            ->assertJsonPath('data.1.name', 'Yasmine Benali')
            ->assertJsonPath('password', 'jury-2026')
            ->assertJsonMissing(['email' => 'marememakalou10@gmail.com']);
    }
}
