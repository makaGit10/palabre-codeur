<?php

namespace Tests\Feature\Api;

use App\Models\Question;
use App\Models\Room;
use App\Models\Snippet;
use App\Models\User;
use App\Services\MessagingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SearchTest extends TestCase
{
    use RefreshDatabase;

    private function seedWorld(): array
    {
        $moussa = User::factory()->create(['name' => 'Moussa Diop', 'city' => 'Dakar']);
        $fatou = User::factory()->create(['name' => 'Fatou Ndiaye', 'city' => 'Thiès']);
        $wave = Room::create(['slug' => 'wave', 'name' => '#wave', 'kind' => Room::TOPIC, 'description' => 'Intégration de Wave']);
        $q = new Question(['title' => 'Webhook Wave : aucune notification reçue en production', 'body' => 'Détails.']);
        $q->author()->associate($moussa)->save();
        $s = new Snippet(['title' => 'Créer un paiement Wave Checkout', 'description' => 'Lien de paiement en FCFA.', 'language' => 'PHP · Laravel', 'fence' => 'php', 'apis' => ['wave'], 'code' => "\$a = 1;\n\$b = 2;"]);
        $s->author()->associate($moussa)->save();
        $service = app(MessagingService::class);
        $service->postToRoom($wave, $moussa, 'Quelqu’un a testé les remboursements Wave ?');
        $group = $service->createGroup($moussa, 'Équipe Dakar', [$fatou->id]);
        $service->postToRoom($group, $moussa, 'Secret du groupe : wave interne');
        $service->send($moussa, $fatou, 'Message privé à propos de Wave');

        return compact('moussa', 'fatou', 'group');
    }

    public function test_results_are_grouped_by_section_and_ranked(): void
    {
        $this->seedWorld();

        $response = $this->getJson('/api/search?q=wave')->assertOk()->assertJsonPath('query', 'wave');
        $sections = collect($response->json('sections'))->keyBy('id');
        // Sections dans un ordre fixe, et seulement celles qui ont des résultats (aucun membre ne s'appelle « wave »)
        $this->assertSame(['questions', 'snippets', 'rooms', 'messages'], $sections->keys()->all());
        $this->assertSame('Webhook Wave : aucune notification reçue en production', $sections['questions']['items'][0]['title']);
        $this->assertSame('Créer un paiement Wave Checkout', $sections['snippets']['items'][0]['title']);
        $this->assertSame('#wave', $sections['rooms']['items'][0]['title']);
        $this->assertSame('/app/salons/wave', $sections['rooms']['items'][0]['url']);
        // Les membres remontent aussi par similarité de nom
        $this->assertSame('Moussa Diop', collect($this->getJson('/api/search?q=mousa')->json('sections'))->keyBy('id')['users']['items'][0]['title']);
    }

    public function test_private_content_never_leaks(): void
    {
        ['fatou' => $fatou] = $this->seedWorld();

        // Visiteur : le message du salon public, mais ni le groupe privé ni le message privé
        $messages = collect($this->getJson('/api/search?q=wave')->json('sections'))->keyBy('id')['messages']['items'];
        $this->assertCount(1, $messages);
        $this->assertStringContainsString('#wave', $messages[0]['title']);
        $this->getJson('/api/search?q=dakar')->assertOk()->assertJsonCount(0, 'sections');

        // Membre du groupe et destinataire du message privé : elle voit les trois messages, et le groupe par son nom
        Sanctum::actingAs($fatou);
        $sections = collect($this->getJson('/api/search?q=wave')->json('sections'))->keyBy('id');
        $this->assertCount(3, $sections['messages']['items']);
        $this->assertSame('Équipe Dakar', collect($this->getJson('/api/search?q=dakar')->json('sections'))->keyBy('id')['rooms']['items'][0]['title']);

        // Une personne étrangère au groupe ne voit ni le groupe ni ses messages
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/search?q=dakar')->assertOk()->assertJsonCount(0, 'sections');
        $this->assertStringNotContainsString('Secret du groupe', json_encode($this->getJson('/api/search?q=wave')->json()));
    }

    public function test_a_query_must_have_at_least_two_characters(): void
    {
        $this->getJson('/api/search?q=w')->assertUnprocessable();
        $this->getJson('/api/search?q=chien')->assertOk()->assertJsonCount(0, 'sections');
    }
}
