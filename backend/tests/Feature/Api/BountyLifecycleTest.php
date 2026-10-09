<?php

namespace Tests\Feature\Api;

use App\Models\Bounty;
use App\Models\Question;
use App\Models\User;
use App\Notifications\BountyRefunded;
use App\Services\BountyRefundService;
use App\Services\QuestionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Cycle de vie complet d'une prime : bloquée → versée ou remboursée, jamais les deux, jamais deux fois */
class BountyLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private User $asker;

    private User $helper;

    private Question $question;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->asker = User::factory()->create(['country' => 'SN']);
        $this->helper = User::factory()->create(['country' => 'SN']);
        $this->question = app(QuestionService::class)->create($this->asker, [
            'title' => 'Webhook Wave muet en production',
            'body' => 'Rien ne rentre dans mes logs.',
            'tags' => ['wave'],
            'bounty' => ['amount' => 1000, 'method' => 'wave'],
        ]);
    }

    private function money(User $user): array
    {
        $user->refresh();

        return ['balance' => $user->wallet_balance, 'held' => $user->wallet_held];
    }

    public function test_an_unclaimed_bounty_is_refunded_once_after_seven_days(): void
    {
        $service = app(BountyRefundService::class);
        $this->assertSame(['balance' => 0, 'held' => 1000], $this->money($this->asker));

        // Avant 7 jours : rien ne bouge
        $this->travel(6)->days();
        $this->assertSame(0, $service->refundExpired());

        $this->travel(2)->days();
        $this->assertSame(1, $service->refundExpired());
        $this->assertSame(0, $service->refundExpired()); // relancé : aucun second remboursement
        $this->artisan('palabre:refund-expired-bounties')->assertSuccessful(); // la commande planifiée non plus

        $this->assertSame(['balance' => 1000, 'held' => 0], $this->money($this->asker));
        $this->assertSame(Bounty::REFUNDED, $this->question->bounty()->value('status'));
        $this->assertSame(1, $this->asker->walletTransactions()->where('type', 'bounty_refunded')->count());
        Notification::assertSentToTimes($this->asker, BountyRefunded::class, 1);
    }

    public function test_after_a_refund_the_answer_can_still_be_accepted_but_nothing_more_is_paid(): void
    {
        $answer = app(QuestionService::class)->answer($this->question, $this->helper, 'Exclure la route du CSRF.');
        $this->travel(8)->days();
        app(BountyRefundService::class)->refundExpired();

        Sanctum::actingAs($this->asker);
        $this->postJson("/api/questions/{$this->question->id}/answers/{$answer->id}/accept")->assertOk();

        $this->assertSame(['balance' => 0, 'held' => 0], $this->money($this->helper));
        $this->assertSame(['balance' => 1000, 'held' => 0], $this->money($this->asker));
    }

    public function test_a_paid_bounty_is_never_refunded(): void
    {
        $answer = app(QuestionService::class)->answer($this->question, $this->helper, 'Exclure la route du CSRF.');
        Sanctum::actingAs($this->asker);
        $this->postJson("/api/questions/{$this->question->id}/answers/{$answer->id}/accept")->assertOk();

        $this->travel(8)->days();
        $this->assertSame(0, app(BountyRefundService::class)->refundExpired());

        $this->assertSame(['balance' => 1000, 'held' => 0], $this->money($this->helper));
        $this->assertSame(['balance' => 0, 'held' => 0], $this->money($this->asker));
        Notification::assertNotSentTo($this->asker, BountyRefunded::class);
    }

    public function test_repeated_accept_requests_pay_the_bounty_only_once(): void
    {
        $answer = app(QuestionService::class)->answer($this->question, $this->helper, 'Exclure la route du CSRF.');
        Sanctum::actingAs($this->asker);

        $this->postJson("/api/questions/{$this->question->id}/answers/{$answer->id}/accept")->assertOk();
        $this->postJson("/api/questions/{$this->question->id}/answers/{$answer->id}/accept")->assertUnprocessable();

        $this->assertSame(['balance' => 1000, 'held' => 0], $this->money($this->helper));
        $this->assertSame(1, $this->helper->walletTransactions()->where('type', 'bounty_received')->count());
    }

    public function test_the_amount_and_recipient_cannot_be_forced_from_the_browser(): void
    {
        $answer = app(QuestionService::class)->answer($this->question, $this->helper, 'Exclure la route du CSRF.');
        Sanctum::actingAs($this->asker);

        // Champs ajoutés à la main dans la requête : ignorés, seule la prime enregistrée compte
        $this->postJson("/api/questions/{$this->question->id}/answers/{$answer->id}/accept", ['amount' => 999999, 'user_id' => $this->asker->id])->assertOk();

        $this->assertSame(1000, $this->helper->fresh()->wallet_balance);
        $this->assertSame(0, $this->asker->fresh()->wallet_balance);
    }
}
