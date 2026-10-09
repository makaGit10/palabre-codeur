<?php

namespace Tests\Feature\Api;

use App\Models\Question;
use App\Models\Report;
use App\Models\Snippet;
use App\Models\User;
use App\Services\QuestionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ModerationTest extends TestCase
{
    use RefreshDatabase;

    private User $author;

    private User $member;

    private User $admin;

    private Question $question;

    protected function setUp(): void
    {
        parent::setUp();
        $this->author = User::factory()->create(['country' => 'SN']);
        $this->member = User::factory()->create(['country' => 'SN']);
        $this->admin = User::factory()->create(['country' => 'SN']);
        $this->admin->forceFill(['is_admin' => true])->save();
        $this->question = app(QuestionService::class)->create($this->author, ['title' => 'Achetez des followers pas chers ici', 'body' => 'Contenu publicitaire.', 'tags' => ['spam']]);
    }

    private function report(?User $as = null, array $overrides = []): TestResponse
    {
        Sanctum::actingAs($as ?? $this->member);

        return $this->postJson('/api/reports', $overrides + ['type' => 'question', 'id' => $this->question->id, 'reason' => 'spam']);
    }

    public function test_a_member_reports_content_once_and_cannot_report_their_own(): void
    {
        $this->report()->assertCreated();
        $this->report()->assertUnprocessable()->assertJsonPath('message', "Vous avez déjà signalé ce contenu. Merci, la modération va l'examiner.");
        $this->report($this->author)->assertUnprocessable();
        $this->report(null, ['reason' => 'nimporte'])->assertUnprocessable()->assertJsonValidationErrors(['reason']);
    }

    public function test_ordinary_members_cannot_moderate_nor_make_themselves_admin(): void
    {
        $this->report()->assertCreated();
        Sanctum::actingAs($this->member);
        $this->getJson('/api/admin/reports')->assertForbidden();
        $reportId = Report::value('id');
        $this->postJson("/api/admin/reports/{$reportId}/resolve", ['decision' => 'hide'])->assertForbidden();
        $this->postJson("/api/admin/content/question/{$this->question->id}/restore")->assertForbidden();

        // Tenter de devenir administrateur à l'inscription : le champ est ignoré
        $this->app['auth']->forgetGuards();
        $this->withHeaders(['Origin' => 'http://localhost:5180', 'Referer' => 'http://localhost:5180/'])->postJson('/api/register', [
            'name' => 'Pirate', 'email' => 'pirate@exemple.com', 'password' => 'motdepasse2026', 'country' => 'SN', 'is_admin' => true,
        ])->assertCreated();
        $this->assertFalse((bool) User::firstWhere('email', 'pirate@exemple.com')->is_admin);
    }

    public function test_an_admin_hides_reported_content_everywhere_then_restores_it(): void
    {
        $this->report()->assertCreated();
        Sanctum::actingAs($this->admin);
        $item = $this->getJson('/api/admin/reports')->assertOk()->assertJsonPath('openCount', 1)->json('data.0');
        $this->assertSame('question', $item['type']);

        $this->postJson("/api/admin/reports/{$item['reportId']}/resolve", ['decision' => 'hide', 'note' => 'Publicité'])->assertOk();
        $this->getJson("/api/questions/{$this->question->id}")->assertNotFound();
        $this->assertNotContains($this->question->id, collect($this->getJson('/api/questions')->json('data'))->pluck('id'));
        $this->getJson('/api/admin/reports')->assertJsonPath('openCount', 0);
        $this->assertDatabaseHas('moderation_logs', ['admin_id' => $this->admin->id, 'action' => 'hide', 'target_id' => $this->question->id, 'note' => 'Publicité']);

        $this->postJson("/api/admin/content/question/{$this->question->id}/restore")->assertOk();
        $this->getJson("/api/questions/{$this->question->id}")->assertOk();
        $this->assertDatabaseHas('moderation_logs', ['action' => 'restore', 'target_id' => $this->question->id]);
    }

    public function test_dismissing_keeps_the_content_visible(): void
    {
        $this->report()->assertCreated();
        Sanctum::actingAs($this->admin);
        $reportId = $this->getJson('/api/admin/reports')->json('data.0.reportId');
        $this->postJson("/api/admin/reports/{$reportId}/resolve", ['decision' => 'dismiss'])->assertOk();
        $this->getJson("/api/questions/{$this->question->id}")->assertOk();
    }

    public function test_hidden_snippets_disappear_from_the_library(): void
    {
        $snippet = new Snippet(['title' => 'Snippet douteux', 'description' => 'Rien de bon ici.', 'language' => 'PHP', 'fence' => 'php', 'apis' => ['wave'], 'code' => 'echo 1;']);
        $snippet->author()->associate($this->author)->save();
        $this->report(null, ['type' => 'snippet', 'id' => $snippet->id, 'reason' => 'offensive'])->assertCreated();

        Sanctum::actingAs($this->admin);
        $reportId = $this->getJson('/api/admin/reports')->json('data.0.reportId');
        $this->postJson("/api/admin/reports/{$reportId}/resolve", ['decision' => 'hide'])->assertOk();
        $this->assertNotContains($snippet->id, collect($this->getJson('/api/snippets')->json('data'))->pluck('id'));
    }
}
