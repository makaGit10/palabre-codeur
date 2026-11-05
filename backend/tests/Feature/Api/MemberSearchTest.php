<?php

namespace Tests\Feature\Api;

use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Messagerie : trouver un développeur par son nom ou parmi ceux de son pays ; salons par pays avec leur drapeau */
class MemberSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_members_of_a_country_are_listed_without_the_requester(): void
    {
        $me = User::factory()->create(['country' => 'SN', 'reputation' => 50]);
        $moussa = User::factory()->create(['name' => 'Moussa Diop', 'country' => 'SN', 'reputation' => 900]);
        $fatou = User::factory()->create(['name' => 'Fatou Ndiaye', 'country' => 'SN', 'reputation' => 300]);
        User::factory()->create(['name' => 'Awa Koné', 'country' => 'CI', 'reputation' => 999]);

        Sanctum::actingAs($me);
        $this->getJson('/api/users/search?country=SN')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $moussa->id)
            ->assertJsonPath('data.1.id', $fatou->id)
            ->assertJsonMissing(['name' => 'Awa Koné']);

        $this->getJson('/api/users/search?q=fat')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Fatou Ndiaye');
        $this->getJson('/api/users/search?country=ZZ')->assertUnprocessable();
    }

    public function test_country_rooms_carry_their_country_code(): void
    {
        Room::create(['slug' => 'senegal', 'name' => '#sénégal', 'kind' => Room::COUNTRY, 'country' => 'SN', 'description' => 'Les développeurs du Sénégal']);
        Room::create(['slug' => 'wave', 'name' => '#wave', 'kind' => Room::TOPIC, 'description' => 'Wave']);

        $rooms = $this->getJson('/api/rooms')->assertOk()->json('data');
        $bySlug = collect($rooms)->keyBy('slug');
        $this->assertSame('SN', $bySlug['senegal']['country']);
        $this->assertNull($bySlug['wave']['country']);
    }
}
