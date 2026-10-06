<?php

namespace Tests\Feature\Api;

use App\Models\Answer;
use App\Models\Question;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VoteTest extends TestCase
{
    use RefreshDatabase;

    private function answerBy(User $author): Answer
    {
        $question = new Question(['title' => 'Question de test pour les votes', 'body' => 'Contenu.']);
        $question->author()->associate(User::factory()->create())->save();
        $answer = $question->answers()->make(['body' => 'Une réponse utile.']);
        $answer->author()->associate($author)->save();

        return $answer;
    }

    public function test_a_vote_counts_once_and_can_be_cancelled(): void
    {
        $author = User::factory()->create();
        $answer = $this->answerBy($author);
        $reputation = $author->fresh()->reputation;
        Sanctum::actingAs(User::factory()->create());

        $this->postJson("/api/answers/{$answer->id}/vote", ['value' => 1])->assertJsonPath('votes', 1);
        $this->postJson("/api/answers/{$answer->id}/vote", ['value' => 1])->assertJsonPath('votes', 1);
        $this->assertSame($reputation + 10, $author->fresh()->reputation);

        $this->postJson("/api/answers/{$answer->id}/vote", ['value' => 0])->assertJsonPath('votes', 0);
        $this->assertSame($reputation, $author->fresh()->reputation);
    }

    public function test_nobody_can_vote_for_their_own_answer(): void
    {
        $author = User::factory()->create();
        $answer = $this->answerBy($author);
        Sanctum::actingAs($author);

        $this->postJson("/api/answers/{$answer->id}/vote", ['value' => 1])->assertForbidden();
        $this->assertSame(0, $answer->fresh()->votes);
    }
}
