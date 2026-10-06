<?php

namespace Tests\Feature\Api;

use App\Models\Question;
use App\Models\Room;
use App\Models\Snippet;
use App\Models\User;
use App\Services\QuestionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MessagingTest extends TestCase
{
    use RefreshDatabase;

    private function room(): Room
    {
        return Room::create(['slug' => 'wave', 'name' => '#wave', 'kind' => Room::TOPIC, 'description' => 'Intégration Wave']);
    }

    public function test_rooms_are_public_but_posting_requires_an_account(): void
    {
        $this->room();

        $this->getJson('/api/rooms')->assertOk()->assertJsonPath('data.0.slug', 'wave')->assertJsonPath('data.0.messagesCount', 0);
        $this->getJson('/api/rooms/wave/messages')->assertOk()->assertJsonCount(0, 'data');
        $this->postJson('/api/rooms/wave/messages', ['body' => 'Bonjour'])->assertUnauthorized();
    }

    public function test_posting_in_a_room_and_fetching_only_new_messages(): void
    {
        $this->room();
        Sanctum::actingAs(User::factory()->create(['name' => 'Moussa Diop']));

        $first = $this->postJson('/api/rooms/wave/messages', ['body' => '  Quelqu\'un a testé les remboursements ?  '])
            ->assertCreated()
            ->assertJsonPath('data.body', 'Quelqu\'un a testé les remboursements ?')
            ->assertJsonPath('data.author.name', 'Moussa Diop')
            ->json('data.id');
        $this->postJson('/api/rooms/wave/messages', ['body' => 'Oui, en sandbox.'])->assertCreated();

        $this->getJson('/api/rooms/wave/messages')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson("/api/rooms/wave/messages?after={$first}")->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.body', 'Oui, en sandbox.');
        $this->postJson('/api/rooms/wave/messages', ['body' => ''])->assertUnprocessable();
    }

    public function test_a_direct_message_creates_the_conversation_and_notifies_the_recipient(): void
    {
        $mareme = User::factory()->create(['name' => 'Mareme MAKALOU']);
        $moussa = User::factory()->create(['name' => 'Moussa Diop']);
        Sanctum::actingAs($moussa);

        $this->postJson("/api/conversations/{$mareme->id}/messages", ['body' => 'Salut Mareme, as-tu vu ma réponse ?'])
            ->assertCreated()
            ->assertJsonPath('mine', true);
        $this->postJson("/api/conversations/{$moussa->id}/messages", ['body' => 'À moi-même'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Vous ne pouvez pas vous écrire à vous-même.');

        // Côté Mareme : conversation visible, un non-lu, une notification ; la lecture du fil marque le message lu
        Sanctum::actingAs($mareme);
        $this->getJson('/api/conversations')->assertOk()
            ->assertJsonPath('unreadCount', 1)
            ->assertJsonPath('data.0.user.name', 'Moussa Diop')
            ->assertJsonPath('data.0.unreadCount', 1)
            ->assertJsonPath('data.0.lastMessage.mine', false);
        $this->getJson('/api/notifications')->assertOk()
            ->assertJsonPath('unreadCount', 1)
            ->assertJsonPath('data.0.kind', 'message')
            ->assertJsonPath('data.0.title', 'Nouveau message de Moussa Diop')
            ->assertJsonPath('data.0.url', "/app/messages/{$moussa->id}");

        $this->getJson("/api/conversations/{$moussa->id}")->assertOk()
            ->assertJsonCount(1, 'messages')
            ->assertJsonPath('messages.0.mine', false);
        $this->getJson('/api/conversations')->assertJsonPath('unreadCount', 0);

        $this->postJson('/api/notifications/read')->assertOk()->assertJsonPath('unreadCount', 0);
        $this->getJson('/api/notifications')->assertJsonPath('unreadCount', 0);
    }

    public function test_a_question_or_a_snippet_can_be_shared_in_a_message(): void
    {
        $this->room();
        $mareme = User::factory()->create(['name' => 'Mareme MAKALOU']);
        $moussa = User::factory()->create(['name' => 'Moussa Diop']);
        $question = new Question(['title' => 'Webhook Wave : aucune notification reçue en production', 'body' => 'Détails.']);
        $question->author()->associate($mareme)->save();
        $snippet = new Snippet(['title' => 'Créer un paiement Wave', 'description' => 'Lien de paiement en FCFA.', 'language' => 'PHP · Laravel', 'fence' => 'php', 'apis' => ['wave'], 'code' => "\$a = 1;\n\$b = 2;"]);
        $snippet->author()->associate($moussa)->save();
        Sanctum::actingAs($mareme);

        // Partage d'une question dans un salon, sans texte : la carte porte le titre et le lien
        $this->postJson('/api/rooms/wave/messages', ['attachment' => ['type' => 'question', 'id' => $question->id]])
            ->assertCreated()
            ->assertJsonPath('data.attachment.type', 'question')
            ->assertJsonPath('data.attachment.title', 'Webhook Wave : aucune notification reçue en production')
            ->assertJsonPath('data.attachment.url', "/app/questions/{$question->id}");
        // L'aperçu du dernier message est tronqué à 70 caractères
        $this->getJson('/api/rooms')->assertJsonPath('data.0.lastMessage.body', fn (string $v) => str_starts_with($v, 'Question partagée : Webhook Wave'));

        // Partage d'un extrait en privé, avec un mot : le code est joint à la carte
        $this->postJson("/api/conversations/{$moussa->id}/messages", ['body' => 'Regarde celui-ci', 'attachment' => ['type' => 'snippet', 'id' => $snippet->id]])
            ->assertCreated()
            ->assertJsonPath('attachment.type', 'snippet')
            ->assertJsonPath('attachment.fence', 'php')
            ->assertJsonPath('attachment.code', "\$a = 1;\n\$b = 2;");

        // Ni texte ni pièce jointe : refusé ; pièce jointe inexistante : refusée
        $this->postJson('/api/rooms/wave/messages', ['body' => '   '])->assertUnprocessable()
            ->assertJsonPath('errors.body.0', 'Écrivez un message ou partagez quelque chose.');
        $this->postJson('/api/rooms/wave/messages', ['attachment' => ['type' => 'snippet', 'id' => 9999]])->assertUnprocessable();
    }

    public function test_answers_and_acceptance_notify_the_right_people(): void
    {
        $asker = User::factory()->create(['country' => 'SN']);
        $helper = User::factory()->create(['name' => 'Fatou Ndiaye']);
        $service = app(QuestionService::class);
        $question = $service->create($asker, [
            'title' => 'Calcul de l\'IPRES dans une paie sénégalaise',
            'body' => 'Quels taux et plafonds appliquer ?',
            'tags' => ['paie'],
            'bounty' => ['amount' => 500, 'method' => 'wave'],
        ]);
        $answer = $service->answer($question, $helper, 'Table de paramètres datée, jamais de taux en dur.');

        Sanctum::actingAs($asker);
        $this->getJson('/api/notifications')->assertJsonPath('unreadCount', 1)
            ->assertJsonPath('data.0.title', 'Fatou Ndiaye a répondu à votre question');

        $this->postJson("/api/questions/{$question->id}/answers/{$answer->id}/accept")->assertOk();

        Sanctum::actingAs($helper);
        $this->getJson('/api/notifications')->assertJsonPath('unreadCount', 1)
            ->assertJsonPath('data.0.kind', 'bounty')
            ->assertJsonPath('data.0.title', 'Votre réponse a été validée · 500 FCFA versés dans votre portefeuille');
    }

    public function test_the_asker_is_not_notified_of_their_own_answer(): void
    {
        $asker = User::factory()->create();
        $question = new Question(['title' => 'Question de test pour les notifications', 'body' => 'Contenu.']);
        $question->author()->associate($asker)->save();
        app(QuestionService::class)->answer($question, $asker, 'Je réponds à ma propre question, finalement.');

        Sanctum::actingAs($asker);
        $this->getJson('/api/notifications')->assertJsonPath('unreadCount', 0);
    }
}
