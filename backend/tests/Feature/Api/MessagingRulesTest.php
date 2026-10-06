<?php

namespace Tests\Feature\Api;

use App\Models\Room;
use App\Models\User;
use App\Services\MessagingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Règles de la messagerie : édition 1 h, suppression 24 h, réactions, mentions, groupes privés */
class MessagingRulesTest extends TestCase
{
    use RefreshDatabase;

    private Room $wave;

    protected function setUp(): void
    {
        parent::setUp();
        $this->wave = Room::create(['slug' => 'wave', 'name' => '#wave', 'kind' => Room::TOPIC]);
    }

    private function postInWave(string $body): int
    {
        return $this->postJson('/api/rooms/wave/messages', ['body' => $body])->assertCreated()->json('data.id');
    }

    public function test_a_message_can_be_edited_by_its_author_for_one_hour_only(): void
    {
        $moussa = User::factory()->create();
        Sanctum::actingAs($moussa);
        $id = $this->postInWave('Quelqu’un a testé les remboursemnts ?');

        $this->patchJson("/api/messages/room/{$id}", ['body' => 'Quelqu’un a testé les remboursements ?'])
            ->assertOk()
            ->assertJsonPath('data.body', 'Quelqu’un a testé les remboursements ?')
            ->assertJsonPath('data.canEdit', true);
        $this->assertNotNull($this->getJson('/api/rooms/wave/messages')->json('data.0.editedAt'));

        // Une autre personne : refusé
        Sanctum::actingAs(User::factory()->create());
        $this->patchJson("/api/messages/room/{$id}", ['body' => 'Piratage'])->assertForbidden();

        // L'auteur, mais 61 minutes plus tard : refusé, avec la règle en clair
        Sanctum::actingAs($moussa);
        $this->travel(61)->minutes();
        $this->patchJson("/api/messages/room/{$id}", ['body' => 'Trop tard'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Un message ne peut être modifié que par son auteur, pendant 60 minutes.');
        $this->assertFalse($this->getJson('/api/rooms/wave/messages')->json('data.0.canEdit'));
    }

    public function test_a_message_can_be_deleted_for_everyone_for_24_hours(): void
    {
        $moussa = User::factory()->create();
        Sanctum::actingAs($moussa);
        $id = $this->postInWave('Message à supprimer');
        $this->postJson("/api/messages/room/{$id}/reactions", ['emoji' => '👍'])->assertOk();

        $this->deleteJson("/api/messages/room/{$id}")
            ->assertOk()
            ->assertJsonPath('data.deleted', true)
            ->assertJsonPath('data.body', '')
            ->assertJsonCount(0, 'data.reactions');
        // La place reste dans le fil, le contenu a disparu, et on ne peut plus réagir
        $this->getJson('/api/rooms/wave/messages')->assertJsonPath('data.0.deleted', true);
        $this->postJson("/api/messages/room/{$id}/reactions", ['emoji' => '👍'])->assertUnprocessable();

        $late = $this->postInWave('Message trop vieux');
        $this->travel(25)->hours();
        $this->deleteJson("/api/messages/room/{$late}")
            ->assertForbidden()
            ->assertJsonPath('message', 'Un message ne peut être supprimé que par son auteur, pendant 24 heures.');
    }

    public function test_reactions_toggle_and_only_proposed_emojis_are_accepted(): void
    {
        $author = User::factory()->create();
        Sanctum::actingAs($author);
        $id = $this->postInWave('Palabre est en ligne 🎉');

        $fatou = User::factory()->create();
        Sanctum::actingAs($fatou);
        $this->postJson("/api/messages/room/{$id}/reactions", ['emoji' => '🔥'])
            ->assertOk()
            ->assertJsonPath('added', true)
            ->assertJsonPath('message.reactions.0.emoji', '🔥')
            ->assertJsonPath('message.reactions.0.count', 1)
            ->assertJsonPath('message.reactions.0.mine', true);
        $this->postJson("/api/messages/room/{$id}/reactions", ['emoji' => '🔥'])
            ->assertOk()
            ->assertJsonPath('added', false)
            ->assertJsonCount(0, 'message.reactions');
        $this->postJson("/api/messages/room/{$id}/reactions", ['emoji' => '💩'])->assertUnprocessable();
    }

    public function test_mentioning_someone_notifies_them_but_not_the_author(): void
    {
        $moussa = User::factory()->create(['name' => 'Moussa Diop']);
        $fatou = User::factory()->create(['name' => 'Fatou Ndiaye']);
        Sanctum::actingAs($moussa);

        $this->postJson('/api/rooms/wave/messages', ['body' => '@Fatou Ndiaye tu as vu ça ?', 'mentions' => [$fatou->id, $moussa->id]])->assertCreated();

        Sanctum::actingAs($fatou);
        $this->getJson('/api/notifications')->assertJsonPath('unreadCount', 1)
            ->assertJsonPath('data.0.kind', 'mention')
            ->assertJsonPath('data.0.title', 'Moussa Diop vous a mentionné dans #wave')
            ->assertJsonPath('data.0.url', '/app/salons/wave');
        Sanctum::actingAs($moussa);
        $this->getJson('/api/notifications')->assertJsonPath('unreadCount', 0);
    }

    public function test_a_private_group_is_only_visible_to_its_members(): void
    {
        $mareme = User::factory()->create();
        $moussa = User::factory()->create();
        $stranger = User::factory()->create();
        Sanctum::actingAs($mareme);

        $slug = $this->postJson('/api/groups', ['name' => 'Équipe Dakar', 'members' => [$moussa->id, $mareme->id]])
            ->assertCreated()->json('data.slug');
        $this->getJson("/api/groups/{$slug}/members")->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('isAdmin', true)->assertJsonPath('data.0.role', 'admin');

        // Le groupe apparaît dans la liste des salons de ses membres, pas des autres ni des visiteurs
        $this->getJson('/api/rooms')->assertJsonFragment(['slug' => $slug, 'isPrivate' => true]);
        Sanctum::actingAs($stranger);
        $this->getJson('/api/rooms')->assertJsonMissing(['slug' => $slug]);
        $this->getJson("/api/rooms/{$slug}/messages")->assertForbidden();
        $this->postJson("/api/rooms/{$slug}/messages", ['body' => 'Coucou'])->assertForbidden();
        $this->postJson("/api/groups/{$slug}/members", ['members' => [$stranger->id]])->assertForbidden();

        // Un membre écrit ; l'autre a un non-lu, qui disparaît quand il ouvre le groupe
        Sanctum::actingAs($moussa);
        $this->postJson("/api/rooms/{$slug}/messages", ['body' => 'Bienvenue dans le groupe !'])->assertCreated();
        Sanctum::actingAs($mareme);
        $this->getJson('/api/rooms')->assertJsonFragment(['slug' => $slug, 'unreadCount' => 1]);
        $this->getJson("/api/rooms/{$slug}/messages")->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/rooms')->assertJsonFragment(['slug' => $slug, 'unreadCount' => 0]);
    }

    public function test_leaving_a_group_hands_over_administration_and_an_empty_group_disappears(): void
    {
        $mareme = User::factory()->create();
        $moussa = User::factory()->create();
        $service = app(MessagingService::class);
        $room = $service->createGroup($mareme, 'Duo', [$moussa->id]);

        Sanctum::actingAs($mareme);
        $this->deleteJson("/api/groups/{$room->slug}/members/me")->assertOk();
        Sanctum::actingAs($moussa);
        $this->getJson("/api/groups/{$room->slug}/members")->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('isAdmin', true);
        $this->deleteJson("/api/groups/{$room->slug}/members/me")->assertOk();
        $this->assertDatabaseMissing('rooms', ['id' => $room->id]);
    }
}
