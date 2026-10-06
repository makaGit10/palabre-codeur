<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WalletTest extends TestCase
{
    use RefreshDatabase;

    private function userWithBalance(string $country, int $balance): User
    {
        $user = User::factory()->create(['country' => $country]);
        $user->forceFill(['wallet_balance' => $balance])->save();

        return $user;
    }

    public function test_a_withdrawal_cannot_exceed_the_balance(): void
    {
        Sanctum::actingAs($this->userWithBalance('SN', 2500));

        $this->postJson('/api/wallet/withdrawals', ['amount' => 3000, 'method' => 'wave', 'account' => '771234567'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Le montant dépasse votre solde disponible.');
    }

    public function test_a_withdrawal_debits_the_wallet_and_masks_the_number(): void
    {
        $user = $this->userWithBalance('SN', 2500);
        Sanctum::actingAs($user);

        $this->postJson('/api/wallet/withdrawals', ['amount' => 2000, 'method' => 'wave', 'account' => '77 123 45 67'])
            ->assertCreated()
            ->assertJsonPath('label', '•••• 4567'); // le front-end compose « Retrait vers … » dans la langue choisie

        $this->assertSame(500, $user->fresh()->wallet_balance);
        $this->assertDatabaseMissing('wallet_transactions', ['account_masked' => '771234567']);
    }

    public function test_methods_depend_on_the_country(): void
    {
        Sanctum::actingAs($this->userWithBalance('MA', 5000));

        $this->postJson('/api/wallet/withdrawals', ['amount' => 2000, 'method' => 'wave', 'account' => '612345678'])
            ->assertUnprocessable()
            ->assertJsonPath('message', "Ce moyen de retrait n'est pas disponible dans votre pays.");

        $this->postJson('/api/wallet/withdrawals', ['amount' => 2000, 'method' => 'bank_transfer', 'account' => 'MA64 0000 1111 2222 3333 4444'])
            ->assertCreated();
    }

    public function test_the_wallet_is_private(): void
    {
        $this->getJson('/api/wallet')->assertUnauthorized();
    }
}
