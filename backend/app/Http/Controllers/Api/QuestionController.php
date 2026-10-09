<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreQuestionRequest;
use App\Http\Resources\QuestionDetailResource;
use App\Http\Resources\QuestionResource;
use App\Models\AiFeedback;
use App\Models\Answer;
use App\Models\Question;
use App\Models\Vote;
use App\Services\PostEditingService;
use App\Services\QuestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Cache;

class QuestionController extends Controller
{
    public function __construct(private readonly QuestionService $questions) {}

    /** Fil : onglets (sans réponse, avec prime), filtre par étiquette et recherche */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Question::query()
            ->with(['author', 'tags', 'bounty'])
            ->withCount('answers')
            ->when($request->query('tag'), fn ($q, $tag) => $q->whereHas('tags', fn ($t) => $t->where('name', $tag)))
            ->when($request->query('q'), function ($q, string $search) {
                $like = '%'.addcslashes($search, '%_\\').'%';
                $q->where(fn ($w) => $w
                    ->where('title', 'ilike', $like)
                    ->orWhereHas('tags', fn ($t) => $t->where('name', 'ilike', $like)));
            });

        match ($request->query('tab')) {
            'sans' => $query->doesntHave('answers'),
            'primes' => $query->whereNull('accepted_answer_id')->whereHas('bounty', fn ($b) => $b->where('status', 'held')),
            default => null,
        };

        return QuestionResource::collection($query->latest()->limit(50)->get());
    }

    public function show(Request $request, Question $question): QuestionDetailResource
    {
        // Une vue comptée par visiteur et par heure
        if (Cache::add("view:{$question->id}:".sha1((string) $request->ip()), true, now()->addHour())) {
            $question->increment('views');
        }

        $question->load(['author', 'tags', 'bounty', 'aiSuggestion', 'answers.author']);
        $question->answers->each->setRelation('question', $question);

        if ($viewer = $request->user('sanctum')) {
            $this->attachViewerState($question, $viewer->id);
        }

        return new QuestionDetailResource($question);
    }

    public function store(StoreQuestionRequest $request): QuestionDetailResource
    {
        $question = $this->questions->create($request->user(), $request->validated());

        return $this->show($request, $question);
    }

    /** Modifier sa question (titre, texte, étiquettes) ; la prime ne se modifie pas */
    public function update(Request $request, Question $question, PostEditingService $editing): QuestionDetailResource
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'min:15', 'max:200'],
            'body' => ['required', 'string', 'min:20', 'max:20000'],
            'tags' => ['required', 'array', 'min:1', 'max:4'],
            'tags.*' => ['string', 'regex:/^[a-z0-9-]{1,40}$/'],
        ]);
        $editing->updateQuestion($question, $request->user(), $data);

        return $this->show($request, $question->refresh());
    }

    public function destroy(Request $request, Question $question, PostEditingService $editing): JsonResponse
    {
        $editing->deleteQuestion($question, $request->user());

        return response()->json(['message' => __('Question supprimée.')]);
    }

    /** Détection de doublons pendant la saisie du titre */
    public function similar(Request $request): AnonymousResourceCollection
    {
        $title = trim((string) $request->query('title'));
        $results = mb_strlen($title) < 6 ? Question::query()->whereRaw('false')->get() : $this->questions->similar($title);
        $results->load(['author', 'tags', 'bounty'])->loadCount('answers');

        return QuestionResource::collection($results);
    }

    // Votes et avis de la personne connectée, en deux requêtes au total
    private function attachViewerState(Question $question, int $viewerId): void
    {
        $answerType = (new Answer)->getMorphClass();
        $votes = Vote::where('user_id', $viewerId)
            ->where(fn ($q) => $q
                ->where(fn ($w) => $w->where('votable_type', $question->getMorphClass())->where('votable_id', $question->id))
                ->orWhere(fn ($w) => $w->where('votable_type', $answerType)->whereIn('votable_id', $question->answers->pluck('id'))))
            ->get();

        $question->my_vote = $votes->first(fn ($v) => $v->votable_type === $question->getMorphClass())?->value ?? 0;
        $question->answers->each(function (Answer $a) use ($votes, $answerType) {
            $a->my_vote = $votes->first(fn ($v) => $v->votable_type === $answerType && $v->votable_id === $a->id)?->value ?? 0;
        });

        if ($question->aiSuggestion) {
            $question->aiSuggestion->my_feedback = AiFeedback::where('ai_suggestion_id', $question->aiSuggestion->id)
                ->where('user_id', $viewerId)
                ->value('value');
        }
    }
}
