<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CountriesTest extends TestCase
{
    use RefreshDatabase;

    // Requêtes envoyées comme par le front-end (même origine), pour activer la session Sanctum
    private function spa(): static
    {
        return $this->withHeaders(['Origin' => 'http://localhost:5180', 'Referer' => 'http://localhost:5180/']);
    }

    public function test_the_26_french_speaking_african_countries_are_configured(): void
    {
        $countries = config('palabre.countries');

        $this->assertCount(26, $countries);
        foreach ($countries as $code => $country) {
            $this->assertMatchesRegularExpression('/^[A-Z]{2}$/', $code);
            $this->assertNotEmpty($country['name'], "$code : nom manquant");
            $this->assertMatchesRegularExpression('/^[A-Z]{3}$/', $country['currency'], "$code : monnaie manquante");
            $this->assertGreaterThanOrEqual(2, count($country['methods']), "$code : au moins deux moyens de retrait");
        }
    }

    public function test_someone_can_register_from_a_newly_added_country(): void
    {
        $this->spa()->postJson('/api/register', [
            'name' => 'Koffi Mensah',
            'email' => 'koffi@exemple.com',
            'password' => 'motdepasse2026',
            'country' => 'TG',
            'city' => 'Lomé',
        ])->assertCreated()
            ->assertJsonPath('data.country', 'TG');
    }

    public function test_a_mobile_money_withdrawal_in_a_new_country_requires_a_phone_number(): void
    {
        $user = User::factory()->create(['country' => 'TG']);
        $user->forceFill(['wallet_balance' => 5000])->save();
        Sanctum::actingAs($user);

        // T-Money est du mobile money : un numéro de téléphone est obligatoire
        $this->postJson('/api/wallet/withdrawals', ['amount' => 2000, 'method' => 'tmoney', 'account' => 'abc'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['account']);

        $this->postJson('/api/wallet/withdrawals', ['amount' => 2000, 'method' => 'tmoney', 'account' => '+228 90 12 34 56'])
            ->assertCreated();

        // Wave n'existe pas au Togo
        $this->postJson('/api/wallet/withdrawals', ['amount' => 1000, 'method' => 'wave', 'account' => '+228 90 12 34 56'])
            ->assertUnprocessable();
    }
}
