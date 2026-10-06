<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\Answer;
use App\Models\Bounty;
use App\Models\Question;
use App\Models\Tag;
use App\Models\User;
use App\Notifications\AnswerAccepted;
use App\Notifications\NewAnswer;
use App\Payments\PaymentGateway;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class QuestionService
{
    public function __construct(private readonly PaymentGateway $payments) {}

    /**
     * Publie une question, avec une prime facultative encaissée puis bloquée jusqu'à validation.
     *
     * @param  array{title: string, body: string, tags: list<string>, bounty?: array{amount: int, method: string}|null}  $data
     */
    public function create(User $author, array $data): Question
    {
        $bounty = $data['bounty'] ?? null;
        if ($bounty && ! in_array($bounty['method'], config("palabre.countries.{$author->country}.methods", []), true)) {
            throw new BusinessRuleException(__("Ce moyen de paiement n'est pas disponible dans votre pays."));
        }

        return DB::transaction(function () use ($author, $data, $bounty) {
            $question = new Question(['title' => $data['title'], 'body' => $data['body']]);
            $question->author()->associate($author)->save();

            $tagIds = collect($data['tags'])->map(fn (string $name) => Tag::firstOrCreate(['name' => $name])->id);
            $question->tags()->sync($tagIds);

            if ($bounty) {
                $reference = $this->payments->collect($bounty['amount'], $bounty['method'], "Prime Palabre · question {$question->id}");
                $question->bounty()->create([
                    'amount' => $bounty['amount'],
                    'payment_method' => $bounty['method'],
                    'expires_at' => now()->addDays(config('palabre.bounty.days_before_refund')),
                ]);
                $author->increment('wallet_held', $bounty['amount']);
                $author->walletTransactions()->create([
                    'type' => 'bounty_held',
                    'amount' => $bounty['amount'],
                    'label' => $question->title, // le front-end compose « Prime offerte · … » dans la langue choisie
                    'payment_method' => $bounty['method'],
                    'provider_reference' => $reference,
                ]);
            }

            $question->aiSuggestion()->create($this->suggest($question));

            return $question;
        });
    }

    /**
     * Questions au titre proche (recherche par trigrammes de PostgreSQL), pour éviter les doublons.
     *
     * @return Collection<int, Question>
     */
    public function similar(string $title, ?int $exceptId = null, int $limit = 3): Collection
    {
        return Question::query()
            ->select('questions.*')
            ->selectRaw('GREATEST(similarity(title, ?), word_similarity(?, title)) AS score', [$title, $title])
            ->when($exceptId, fn ($q) => $q->whereKeyNot($exceptId))
            ->whereRaw('GREATEST(similarity(title, ?), word_similarity(?, title)) > 0.25', [$title, $title])
            ->orderByDesc('score')
            ->limit($limit)
            ->get();
    }

    /**
     * Première piste proposée automatiquement : si une question proche est déjà résolue,
     * on renvoie vers sa réponse validée ; sinon, des conseils pour obtenir une réponse rapide.
     * Elle est affichée comme « à vérifier par la communauté ».
     *
     * @return array{text: string, model: string}
     */
    private function suggest(Question $question): array
    {
        $solved = $this->similar($question->title, $question->id, 5)->first(fn (Question $q) => $q->isSolved());

        if ($solved) {
            $body = (string) $solved->acceptedAnswer()->value('body');
            $excerpt = Str::limit(trim(preg_replace('/```.*?```|[*`#>]/s', '', $body)), 220);

            return [
                'text' => __('Une question proche a déjà été résolue : « :title ». La réponse validée conseille : :excerpt', ['title' => $solved->title, 'excerpt' => $excerpt]),
                'model' => 'similarite-postgresql',
            ];
        }

        return [
            'text' => __("Je n'ai pas trouvé de question identique déjà résolue. Ajoutez le message d'erreur exact et la version de vos outils : cela aide la communauté à répondre plus vite."),
            'model' => 'regles',
        ];
    }

    public function answer(Question $question, User $author, string $body): Answer
    {
        $answer = $question->answers()->make(['body' => $body]);
        $answer->author()->associate($author)->save();

        if ($question->user_id !== $author->id) {
            User::findOrFail($question->user_id)->notify(new NewAnswer($answer, $question));
        }

        return $answer;
    }

    /**
     * Valide une réponse. Si la question a une prime bloquée, elle est versée au portefeuille de l'auteur de la réponse.
     *
     * @return array{recipient: User, bounty: Bounty|null}
     */
    public function accept(Question $question, Answer $answer, User $user): array
    {
        if ($question->user_id !== $user->id) {
            throw new BusinessRuleException(__("Seul l'auteur de la question peut valider une réponse."), 403);
        }
        if ($answer->question_id !== $question->id) {
            throw new BusinessRuleException(__("Cette réponse n'appartient pas à cette question."));
        }

        return DB::transaction(function () use ($question, $answer, $user) {
            // Verrou : deux clics simultanés ne peuvent pas verser la prime deux fois
            $question = Question::lockForUpdate()->findOrFail($question->id);
            if ($question->isSolved()) {
                throw new BusinessRuleException(__('Une réponse a déjà été validée pour cette question.'));
            }

            $bounty = $question->bounty()->lockForUpdate()->first();
            $recipient = User::lockForUpdate()->findOrFail($answer->user_id);
            if ($bounty?->status === Bounty::HELD && $recipient->id === $user->id) {
                throw new BusinessRuleException(__('Vous ne pouvez pas valider votre propre réponse sur une question avec prime.'));
            }

            $question->forceFill(['accepted_answer_id' => $answer->id])->save();
            $rep = config('palabre.reputation');
            if ($recipient->id !== $user->id) { // pas de points pour valider sa propre réponse
                $recipient->increment('reputation', $rep['answer_accepted']);
                $user->increment('reputation', $rep['accepting_answer']);
            }

            if ($bounty?->status !== Bounty::HELD) {
                if ($recipient->id !== $user->id) {
                    $recipient->notify(new AnswerAccepted($question, null));
                }

                return ['recipient' => $recipient->refresh(), 'bounty' => null];
            }

            $bounty->forceFill(['status' => Bounty::PAID, 'paid_to_user_id' => $recipient->id, 'paid_at' => now()])->save();
            $recipient->increment('wallet_balance', $bounty->amount);
            $recipient->increment('bounty_earnings', $bounty->amount);
            $recipient->increment('reputation', $rep['bounty_won']);
            $user->decrement('wallet_held', min($bounty->amount, $user->wallet_held));

            $recipient->walletTransactions()->create([
                'type' => 'bounty_received',
                'amount' => $bounty->amount,
                'label' => $question->title,
            ]);
            $user->walletTransactions()->create([
                'type' => 'bounty_paid',
                'amount' => $bounty->amount,
                'label' => "{$recipient->name} · {$question->title}",
            ]);

            $recipient->notify(new AnswerAccepted($question, $bounty->amount));

            return ['recipient' => $recipient->refresh(), 'bounty' => $bounty];
        });
    }
}
