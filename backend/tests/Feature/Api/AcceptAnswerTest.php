<?php

namespace Tests\Feature\Api;

use App\Models\Answer;
use App\Models\Question;
use App\Models\User;
use App\Services\QuestionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AcceptAnswerTest extends TestCase
{
    use RefreshDatabase;

    private User $asker;

    private User $helper;

    private Question $question;

    private Answer $answer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->asker = User::factory()->create(['country' => 'SN']);
        $this->helper = User::factory()->create(['country' => 'MA']);
        $service = app(QuestionService::class);
        $this->question = $service->create($this->asker, [
            'title' => 'Webhook Wave : aucune notification en production',
            'body' => 'Le paiement passe mais mon endpoint ne reçoit rien.',
            'tags' => ['wave'],
            'bounty' => ['amount' => 2000, 'method' => 'wave'],
        ]);
        $this->answer = $service->answer($this->question, $this->helper, 'Déplace la route dans api.php à cause du CSRF.');
    }

    private function acceptUrl(): string
    {
        return "/api/questions/{$this->question->id}/answers/{$this->answer->id}/accept";
    }

    public function test_only_the_author_of_the_question_can_accept(): void
    {
        Sanctum::actingAs($this->helper);

        $this->postJson($this->acceptUrl())->assertForbidden();
        $this->assertNull($this->question->fresh()->accepted_answer_id);
    }

    public function test_accepting_pays_the_bounty_into_the_helpers_wallet(): void
    {
        Sanctum::actingAs($this->asker);
        $reputationBefore = $this->helper->fresh()->reputation;

        $this->postJson($this->acceptUrl())
            ->assertOk()
            ->assertJsonPath('bountyPaid.amount', 2000)
            ->assertJsonPath('bountyPaid.status', 'paid');

        $helper = $this->helper->fresh();
        $this->assertSame(2000, $helper->wallet_balance);
        $this->assertSame(2000, $helper->bounty_earnings);
        $this->assertSame($reputationBefore + 15 + 50, $helper->reputation);
        $this->assertSame(0, $this->asker->fresh()->wallet_held);
        $this->assertDatabaseHas('wallet_transactions', ['user_id' => $helper->id, 'type' => 'bounty_received', 'amount' => 2000]);
        $this->assertDatabaseHas('wallet_transactions', ['user_id' => $this->asker->id, 'type' => 'bounty_paid', 'amount' => 2000]);
    }

    public function test_the_bounty_cannot_be_paid_twice(): void
    {
        Sanctum::actingAs($this->asker);

        $this->postJson($this->acceptUrl())->assertOk();
        $this->postJson($this->acceptUrl())
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Une réponse a déjà été validée pour cette question.');

        $this->assertSame(2000, $this->helper->fresh()->wallet_balance);
    }
}
