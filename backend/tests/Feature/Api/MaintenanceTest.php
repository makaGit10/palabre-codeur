<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MaintenanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_maintenance_mode_answers_with_a_recognisable_code_and_an_elegant_page(): void
    {
        $this->artisan('down', ['--retry' => 60])->assertSuccessful();

        try {
            $this->getJson('/api/questions')->assertStatus(503)->assertJsonPath('code', 'maintenance');
            $this->get('/')->assertStatus(503)->assertSee("On taille les branches de l'arbre.");
        } finally {
            $this->artisan('up');
        }
        $this->getJson('/api/questions')->assertOk();
    }

    public function test_an_unknown_page_shows_the_palabre_404(): void
    {
        $this->get('/nexiste-pas')->assertNotFound()->assertSee("Cette page s'est perdue en chemin.");
    }
}
