<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\Answer;
use App\Models\Question;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Modifier ou supprimer sa propre question ou réponse.
 * Règles : seul l'auteur agit sur son contenu ; on ne supprime jamais ce qui porte le travail des autres
 * ou de l'argent (question avec réponses ou avec prime, réponse validée). Aucune écriture financière n'est effacée.
 */
class PostEditingService
{
    /** @param array{title: string, body: string, tags: list<string>} $data */
    public function updateQuestion(Question $question, User $user, array $data): Question
    {
        $this->assertAuthor($question->user_id, $user);

        return DB::transaction(function () use ($question, $data) {
            $question->forceFill(['title' => $data['title'], 'body' => $data['body'], 'edited_at' => now()])->save();
            $question->tags()->sync(collect($data['tags'])->map(fn (string $name) => Tag::firstOrCreate(['name' => $name])->id));

            return $question;
        });
    }

    public function deleteQuestion(Question $question, User $user): void
    {
        $this->assertAuthor($question->user_id, $user);

        DB::transaction(function () use ($question) {
            $question = Question::lockForUpdate()->findOrFail($question->id);
            if ($question->bounty()->exists()) {
                throw new BusinessRuleException(__('Une prime est liée à cette question : elle ne peut pas être supprimée.'));
            }
            if ($question->answers()->withoutGlobalScope('visible')->exists()) {
                throw new BusinessRuleException(__('Des réponses ont déjà été publiées : la question reste en ligne pour respecter le travail de la communauté. Vous pouvez encore la modifier.'));
            }
            $question->tags()->detach();
            $question->delete();
        });
    }

    public function updateAnswer(Answer $answer, User $user, string $body): Answer
    {
        $this->assertAuthor($answer->user_id, $user);
        $answer->forceFill(['body' => $body, 'edited_at' => now()])->save();

        return $answer;
    }

    public function deleteAnswer(Answer $answer, User $user): void
    {
        $this->assertAuthor($answer->user_id, $user);

        DB::transaction(function () use ($answer) {
            // Verrou sur la question : une validation simultanée ne peut pas viser une réponse en cours de suppression
            $question = Question::withoutGlobalScope('visible')->lockForUpdate()->findOrFail($answer->question_id);
            if ($question->accepted_answer_id === $answer->id) {
                throw new BusinessRuleException(__('Une réponse validée ne peut pas être supprimée.'));
            }
            $answer->delete();
        });
    }

    private function assertAuthor(int $authorId, User $user): void
    {
        if ($authorId !== $user->id) {
            throw new BusinessRuleException(__('Vous ne pouvez modifier que vos propres contenus.'), 403);
        }
    }
}
