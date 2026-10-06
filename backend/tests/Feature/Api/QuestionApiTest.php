<?php

namespace Tests\Feature\Api;

use App\Models\Question;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QuestionApiTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Webhook Wave : aucune notification en production',
            'body' => 'Le paiement passe côté client mais mon endpoint ne reçoit rien.',
            'tags' => ['wave', 'laravel'],
        ], $overrides);
    }

    public function test_guests_can_read_but_not_post(): void
    {
        $this->getJson('/api/questions')->assertOk();
        $this->postJson('/api/questions', $this->payload())->assertUnauthorized();
    }

    public function test_posting_a_question_with_a_bounty_holds_the_money(): void
    {
        $mareme = User::factory()->create(['country' => 'SN']);
        Sanctum::actingAs($mareme);

        $response = $this->postJson('/api/questions', $this->payload(['bounty' => ['amount' => 1000, 'method' => 'wave']]));

        $response->assertCreated()
            ->assertJsonPath('data.bounty.amount', 1000)
            ->assertJsonPath('data.bounty.status', 'held')
            ->assertJsonPath('data.tags', ['wave', 'laravel']);
        $this->assertSame(1000, $mareme->fresh()->wallet_held);
        $this->assertDatabaseHas('wallet_transactions', ['user_id' => $mareme->id, 'type' => 'bounty_held', 'amount' => 1000]);
        $this->assertNotNull($response->json('data.aiSuggestion.text'));
    }

    public function test_bounty_method_must_be_available_in_the_authors_country(): void
    {
        Sanctum::actingAs(User::factory()->create(['country' => 'MA']));

        $this->postJson('/api/questions', $this->payload(['bounty' => ['amount' => 1000, 'method' => 'wave']]))
            ->assertUnprocessable()
            ->assertJsonPath('message', "Ce moyen de paiement n'est pas disponible dans votre pays.");
    }

    public function test_validation_errors_are_in_french(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/questions', $this->payload(['title' => 'Trop court', 'tags' => []]))
            ->assertUnprocessable()
            ->assertJsonPath('errors.title.0', 'Le champ titre doit contenir au moins 15 caractères.')
            ->assertJsonPath('errors.tags.0', 'Le champ étiquettes est obligatoire.');
    }

    public function test_similar_questions_are_found_while_typing_the_title(): void
    {
        $author = User::factory()->create();
        foreach (['Webhook Wave : aucune notification reçue en production', 'Flutter lent sur petits téléphones'] as $title) {
            $q = new Question(['title' => $title, 'body' => 'Détails de la question.']);
            $q->author()->associate($author)->save();
        }

        $this->getJson('/api/questions/similar?title='.urlencode('webhook wave production'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Webhook Wave : aucune notification reçue en production');
    }

    public function test_public_profiles_never_expose_email_or_wallet(): void
    {
        $user = User::factory()->create();

        $this->getJson("/api/users/{$user->id}")
            ->assertOk()
            ->assertJsonMissingPath('user.email')
            ->assertJsonMissingPath('user.wallet_balance');
    }
}
