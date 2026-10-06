<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LocaleTest extends TestCase
{
    use RefreshDatabase;

    public function test_messages_are_in_french_by_default_and_in_english_on_request(): void
    {
        $me = User::factory()->create();
        Sanctum::actingAs($me);

        $this->getJson("/api/conversations/{$me->id}")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Vous ne pouvez pas vous écrire à vous-même.');

        $this->getJson("/api/conversations/{$me->id}", ['Accept-Language' => 'en'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'You cannot message yourself.');

        // Les règles de validation aussi (traductions fournies par Laravel)
        $this->getJson('/api/search?q=w', ['Accept-Language' => 'en-US,en;q=0.9'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.q.0', 'The q field must be at least 2 characters.');
        $this->getJson('/api/search?q=w')
            ->assertUnprocessable()
            ->assertJsonPath('errors.q.0', fn (string $m) => str_contains($m, 'caractères'));
    }

    public function test_notifications_are_rendered_in_the_reader_language(): void
    {
        $mareme = User::factory()->create(['name' => 'Mareme MAKALOU']);
        $moussa = User::factory()->create(['name' => 'Moussa Diop']);
        Sanctum::actingAs($moussa);
        $this->postJson("/api/conversations/{$mareme->id}/messages", ['body' => 'Salut !'])->assertCreated();

        Sanctum::actingAs($mareme);
        $this->getJson('/api/notifications')->assertJsonPath('data.0.title', 'Nouveau message de Moussa Diop');
        $this->getJson('/api/notifications', ['Accept-Language' => 'en'])
            ->assertJsonPath('data.0.title', 'New message from Moussa Diop')
            ->assertJsonPath('data.0.body', 'Salut !');
    }
}
