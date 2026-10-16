<?php

namespace Tests\Feature\Api;

use App\Models\Snippet;
use App\Models\User;
use App\Services\QuestionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaginationTest extends TestCase
{
    use RefreshDatabase;

    public function test_questions_come_twenty_at_a_time_with_server_side_filters(): void
    {
        $author = User::factory()->create(['country' => 'SN']);
        $service = app(QuestionService::class);
        foreach (range(1, 25) as $i) {
            $service->create($author, ['title' => "Question numéro {$i} sur Laravel", 'body' => 'Contenu de la question.', 'tags' => [$i % 5 === 0 ? 'wave' : 'laravel']]);
        }
        $bounty = $service->create($author, ['title' => 'Question avec prime Wave', 'body' => 'Contenu.', 'tags' => ['wave'], 'bounty' => ['amount' => 2000, 'method' => 'wave']]);

        $first = $this->getJson('/api/questions')->assertOk()->assertJsonCount(20, 'data')->assertJsonPath('meta.last_page', 2);
        $this->assertSame($bounty->id, $first->json('data.0.id')); // la plus récente d'abord
        $this->getJson('/api/questions?page=2')->assertJsonCount(6, 'data');

        $this->getJson('/api/questions?tag=wave')->assertJsonCount(6, 'data');
        $this->getJson('/api/questions?tab=primes&sort=bounty')->assertJsonCount(1, 'data')->assertJsonPath('data.0.bounty.amount', 2000);
        $this->getJson("/api/questions?tags=wave&exclude={$bounty->id}&per_page=3")->assertJsonCount(3, 'data');
        $this->getJson('/api/questions?per_page=500')->assertJsonCount(26, 'data'); // plafonné à 50 par page
        $this->getJson('/api/stats')->assertJsonPath('openBounties', 1)->assertJsonPath('openBountiesTotal', 2000);
    }

    public function test_snippets_are_paginated_and_filtered_by_api(): void
    {
        $author = User::factory()->create();
        foreach (range(1, 22) as $i) {
            $snippet = new Snippet(['title' => "Extrait {$i}", 'description' => 'Paiement.', 'language' => 'PHP', 'fence' => 'php', 'apis' => [$i <= 4 ? 'paytech' : 'wave'], 'code' => 'echo 1;']);
            $snippet->author()->associate($author)->save();
        }

        $this->getJson('/api/snippets')->assertOk()->assertJsonCount(20, 'data')->assertJsonPath('meta.last_page', 2);
        $this->getJson('/api/snippets?api=paytech')->assertJsonCount(4, 'data');
        $this->getJson('/api/snippets?q=Extrait 2')->assertJsonPath('data.0.title', 'Extrait 22');
    }
}
