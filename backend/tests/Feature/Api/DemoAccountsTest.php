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
        User::factory()->create(['email' => 'marememakalou10@gmail.com']);

        $this->getJson('/api/demo-accounts')->assertNotFound();
    }

    public function test_the_team_accounts_are_listed_with_the_shared_password_when_enabled(): void
    {
        config([
            'palabre.demo.accounts_public' => true,
            'palabre.demo.password' => 'jury-2026',
            'palabre.demo.public_accounts' => ['marememakalou10@gmail.com', 'mlletech11@gmail.com'],
        ]);
        User::factory()->create(['name' => 'mlle_tech', 'email' => 'mlletech11@gmail.com', 'country' => 'SN']);
        User::factory()->create(['name' => 'Mareme MAKALOU', 'email' => 'marememakalou10@gmail.com', 'country' => 'SN']);
        User::factory()->create(['name' => 'Moussa Diop', 'email' => 'moussa@palabre.test', 'country' => 'SN']);

        $this->getJson('/api/demo-accounts')->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.email', 'marememakalou10@gmail.com') // ordre de la configuration, pas de la base
            ->assertJsonPath('data.1.name', 'mlle_tech')
            ->assertJsonPath('password', 'jury-2026')
            ->assertJsonMissing(['email' => 'moussa@palabre.test']);
    }
}
