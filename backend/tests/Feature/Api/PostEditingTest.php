<?php

namespace Tests\Feature\Api;

use App\Models\Question;
use App\Models\User;
use App\Services\QuestionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PostEditingTest extends TestCase
{
    use RefreshDatabase;

    private User $author;

    private User $other;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->author = User::factory()->create(['country' => 'SN']);
        $this->other = User::factory()->create(['country' => 'SN']);
    }

    private function question(?array $bounty = null): Question
    {
        return app(QuestionService::class)->create($this->author, ['title' => 'Comment signer un webhook Wave ?', 'body' => 'Je cherche la bonne méthode de vérification.', 'tags' => ['wave'], 'bounty' => $bounty]);
    }

    private function edit(): array
    {
        return ['title' => 'Comment vérifier la signature d’un webhook Wave ?', 'body' => 'Je cherche la bonne méthode de vérification HMAC en PHP.', 'tags' => ['wave', 'php']];
    }

    public function test_only_the_author_edits_a_question_and_it_is_marked_as_edited(): void
    {
        $question = $this->question();

        Sanctum::actingAs($this->other);
        $this->patchJson("/api/questions/{$question->id}", $this->edit())->assertForbidden();

        Sanctum::actingAs($this->author);
        $this->patchJson("/api/questions/{$question->id}", $this->edit())->assertOk()
            ->assertJsonPath('data.title', 'Comment vérifier la signature d’un webhook Wave ?')
            ->assertJsonPath('data.tags', ['wave', 'php']);
        $this->assertNotNull($question->fresh()->edited_at);
        $this->patchJson("/api/questions/{$question->id}", ['title' => 'court', 'body' => 'x', 'tags' => []])->assertUnprocessable();
    }

    public function test_a_question_without_answers_nor_bounty_can_be_deleted_by_its_author_only(): void
    {
        $question = $this->question();
        Sanctum::actingAs($this->other);
        $this->deleteJson("/api/questions/{$question->id}")->assertForbidden();

        Sanctum::actingAs($this->author);
        $this->deleteJson("/api/questions/{$question->id}")->assertOk();
        $this->assertDatabaseMissing('questions', ['id' => $question->id]);
    }

    public function test_a_question_with_answers_or_a_bounty_stays_online(): void
    {
        $withAnswer = $this->question();
        app(QuestionService::class)->answer($withAnswer, $this->other, 'Utilise hash_hmac avec ta clé secrète.');
        $withBounty = $this->question(['amount' => 500, 'method' => 'wave']);

        Sanctum::actingAs($this->author);
        $this->deleteJson("/api/questions/{$withAnswer->id}")->assertUnprocessable();
        $this->deleteJson("/api/questions/{$withBounty->id}")->assertUnprocessable();
        $this->assertSame(1, $this->author->walletTransactions()->where('type', 'bounty_held')->count()); // rien d'effacé
    }

    public function test_answers_are_edited_and_deleted_by_their_author_but_an_accepted_answer_stays(): void
    {
        $question = $this->question();
        $answer = app(QuestionService::class)->answer($question, $this->other, 'Utilise hash_hmac avec ta clé secrète.');

        Sanctum::actingAs($this->author);
        $this->patchJson("/api/answers/{$answer->id}", ['body' => 'Je modifie la réponse de quelqu’un d’autre.'])->assertForbidden();
        $this->deleteJson("/api/answers/{$answer->id}")->assertForbidden();

        Sanctum::actingAs($this->other);
        $this->patchJson("/api/answers/{$answer->id}", ['body' => 'Utilise hash_hmac("sha256", $payload, $secret) puis hash_equals.'])->assertOk();
        $this->assertNotNull($answer->fresh()->edited_at);

        Sanctum::actingAs($this->author);
        $this->postJson("/api/questions/{$question->id}/answers/{$answer->id}/accept")->assertOk();
        Sanctum::actingAs($this->other);
        $this->deleteJson("/api/answers/{$answer->id}")->assertUnprocessable();

        $second = app(QuestionService::class)->answer($question, $this->other, 'Autre piste : vérifier l’horodatage.');
        $this->deleteJson("/api/answers/{$second->id}")->assertOk();
    }

    public function test_members_edit_their_public_profile_but_nothing_else(): void
    {
        Sanctum::actingAs($this->author);
        $this->patchJson('/api/me', ['name' => 'Mareme M.', 'city' => 'Thiès', 'reputation' => 99999, 'is_admin' => true, 'email' => 'autre@exemple.com'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Mareme M.')
            ->assertJsonPath('data.city', 'Thiès');

        $fresh = $this->author->fresh();
        $this->assertNotSame(99999, $fresh->reputation);
        $this->assertFalse((bool) $fresh->is_admin);
        $this->assertNotSame('autre@exemple.com', $fresh->email);
        $this->patchJson('/api/me', ['name' => 'X'])->assertUnprocessable()->assertJsonValidationErrors(['name']);
    }
}
