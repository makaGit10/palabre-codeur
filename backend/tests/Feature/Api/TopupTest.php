<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\WalletTopup;
use App\Notifications\TopupReceived;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TopupTest extends TestCase
{
    use RefreshDatabase;

    private function paytechKeys(): void
    {
        config(['palabre.paytech.api_key' => 'cle-test', 'palabre.paytech.api_secret' => 'secret-test']);
    }

    private function ipn(string $reference, int $amount, array $overrides = []): array
    {
        return $overrides + [
            'type_event' => 'sale_complete',
            'ref_command' => $reference,
            'item_price' => $amount,
            'payment_method' => 'Wave',
            'token' => 'tok_123',
            'api_key_sha256' => hash('sha256', 'cle-test'),
            'api_secret_sha256' => hash('sha256', 'secret-test'),
        ];
    }

    public function test_without_paytech_keys_a_topup_is_simulated_and_credited_at_once(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/wallet/topups', ['amount' => 5000])->assertCreated()
            ->assertJsonPath('status', 'paid')
            ->assertJsonPath('testMode', true);

        $this->assertSame(5000, $user->fresh()->wallet_balance);
        $this->getJson('/api/wallet')->assertJsonPath('transactions.0.type', 'topup');
        Notification::assertSentTo($user, TopupReceived::class);
    }

    public function test_amounts_outside_the_limits_are_refused(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/wallet/topups', ['amount' => 100])->assertUnprocessable();
        $this->postJson('/api/wallet/topups', ['amount' => 10_000_000])->assertUnprocessable();
    }

    public function test_with_paytech_the_wallet_is_credited_once_by_an_authentic_ipn(): void
    {
        Notification::fake();
        $this->paytechKeys();
        Http::fake(['paytech.sn/*' => Http::response(['success' => 1, 'token' => 'tok_123', 'redirect_url' => 'https://paytech.sn/payment/checkout/tok_123'])]);
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $reference = $this->postJson('/api/wallet/topups', ['amount' => 2000])->assertCreated()
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('redirectUrl', 'https://paytech.sn/payment/checkout/tok_123')
            ->json('reference');
        Http::assertSent(fn ($request) => $request->hasHeader('API_KEY', 'cle-test') && $request['item_price'] === 2000 && $request['ref_command'] === $reference);
        $this->assertSame(0, $user->fresh()->wallet_balance);

        // Fausse notification (mauvaises empreintes) : refusée
        $this->postJson('/api/paytech/ipn', $this->ipn($reference, 2000, ['api_key_sha256' => 'faux']))->assertForbidden();
        // Montant qui ne correspond pas : ignoré
        $this->postJson('/api/paytech/ipn', $this->ipn($reference, 200))->assertOk();
        $this->assertSame(0, $user->fresh()->wallet_balance);

        // Vraie notification, reçue deux fois : un seul crédit
        $this->postJson('/api/paytech/ipn', $this->ipn($reference, 2000))->assertOk();
        $this->postJson('/api/paytech/ipn', $this->ipn($reference, 2000))->assertOk();
        $this->assertSame(2000, $user->fresh()->wallet_balance);
        $this->assertSame(WalletTopup::PAID, WalletTopup::firstWhere('reference', $reference)->status);
        Notification::assertSentToTimes($user, TopupReceived::class, 1);
    }
}
