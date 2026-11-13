<?php

namespace Tests\Feature\Api;

use App\Events\LiveChanged;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Temps réel : un signal sans données après chaque écriture réussie, et seulement dans ce cas */
class LiveChangesTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        config(['broadcasting.default' => 'log']);
        $this->user = User::factory()->create(['country' => 'SN']);
    }

    private function fakeSignals(): void
    {
        Event::fake([LiveChanged::class]);
    }

    private function question(): array
    {
        return ['title' => 'Comment signer un webhook Wave ?', 'body' => 'Je cherche la bonne méthode de vérification.', 'tags' => ['wave']];
    }

    public function test_a_successful_write_signals_the_topics_without_any_data(): void
    {
        $this->fakeSignals();
        Sanctum::actingAs($this->user);
        $this->withHeader('X-Socket-ID', '123.456')->postJson('/api/questions', $this->question())->assertCreated();

        Event::assertDispatched(LiveChanged::class, function (LiveChanged $event) {
            $payload = $event->broadcastWith();

            return in_array('questions', $event->topics, true)
                && $event->actorId === $this->user->id
                && $event->socketId === '123.456'
                && $event->broadcastAs() === 'changed'
                && array_keys($payload) === ['topics', 'actorId', 'socketId', 'at'];
        });
    }

    public function test_a_read_never_signals_even_when_it_touches_technical_data(): void
    {
        $this->fakeSignals();
        $this->getJson('/api/questions')->assertOk();
        $this->getJson('/api/questions/similar?title=webhook+wave')->assertOk();
        Event::assertNotDispatched(LiveChanged::class);

        // La connexion écrit un jeton et une session : rien à rafraîchir chez les autres
        $this->withHeaders(['Origin' => 'http://localhost:5180', 'Referer' => 'http://localhost:5180/'])
            ->postJson('/api/login', ['email' => $this->user->email, 'password' => 'password', 'remember' => true])->assertOk();
        Event::assertNotDispatched(LiveChanged::class);
    }

    public function test_a_refused_write_does_not_signal(): void
    {
        $this->fakeSignals();
        Sanctum::actingAs($this->user);
        $this->postJson('/api/questions', ['title' => 'x'])->assertUnprocessable();
        Event::assertNotDispatched(LiveChanged::class);
    }

    public function test_an_unreachable_realtime_server_never_fails_the_request(): void
    {
        // Pas de simulation ici : l'événement part vraiment vers un serveur injoignable
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb' => ['driver' => 'reverb', 'key' => 'k', 'secret' => 's', 'app_id' => '1', 'options' => ['host' => '127.0.0.1', 'port' => 1, 'scheme' => 'http', 'useTLS' => false]],
        ]);
        Sanctum::actingAs($this->user);
        $this->postJson('/api/questions', $this->question())->assertCreated();
    }

    public function test_the_browser_only_receives_public_connection_settings(): void
    {
        $this->getJson('/api/live')
            ->assertOk()
            ->assertJsonStructure(['enabled', 'key', 'host', 'port', 'scheme', 'path', 'channel'])
            ->assertJsonMissingPath('secret');
    }

    public function test_live_config_uses_the_visited_host_when_none_is_configured(): void
    {
        config(['palabre.live.public.host' => '']);

        $this->getJson('http://palabre.site/api/live')->assertOk()->assertJsonPath('host', 'palabre.site');
    }
}
