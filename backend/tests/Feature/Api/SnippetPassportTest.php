<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SnippetPassportTest extends TestCase
{
    use RefreshDatabase;

    private function snippet(array $extra = []): array
    {
        return $extra + [
            'title' => 'Créer un paiement Wave Checkout',
            'description' => 'Génère un lien de paiement Wave en FCFA.',
            'language' => 'PHP',
            'fence' => 'php',
            'tags' => ['wave'],
            'code' => "\$r = Http::post(\$url);\nreturn \$r->json('wave_launch_url');",
        ];
    }

    public function test_a_snippet_carries_its_passport_and_never_claims_an_automated_test(): void
    {
        $author = User::factory()->create();
        $tester = User::factory()->create();
        Sanctum::actingAs($author);
        $id = $this->postJson('/api/snippets', $this->snippet([
            'api_version' => 'Wave Checkout API v1',
            'requirements' => 'Laravel 10, clé API Wave Business',
            'environment' => 'Compte Wave Business',
            'license' => 'Apache-2.0',
            'limitations' => 'Montant entier en XOF',
        ]))->assertCreated()->json('data.id');

        $this->getJson('/api/snippets')->assertJsonPath('data.0.passport.apiVersion', 'Wave Checkout API v1')
            ->assertJsonPath('data.0.passport.license', 'Apache-2.0')
            ->assertJsonPath('data.0.passport.lastVerifiedAt', null)
            ->assertJsonPath('data.0.passport.automatedTest', false);

        Sanctum::actingAs($tester);
        $this->postJson("/api/snippets/{$id}/tested")->assertSuccessful();
        $this->assertNotNull($this->getJson('/api/snippets')->json('data.0.passport.lastVerifiedAt'));
    }

    public function test_only_permissive_licences_are_accepted_and_mit_is_the_default(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/snippets', $this->snippet(['license' => 'GPL-3.0']))->assertUnprocessable()->assertJsonValidationErrors(['license']);
        $this->postJson('/api/snippets', $this->snippet())->assertCreated()->assertJsonPath('data.passport.license', 'MIT');
    }
}
