<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAnswerRequest;
use App\Http\Resources\AnswerResource;
use App\Http\Resources\BountyResource;
use App\Http\Resources\UserResource;
use App\Models\Answer;
use App\Models\Question;
use App\Services\PostEditingService;
use App\Services\QuestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnswerController extends Controller
{
    public function __construct(private readonly QuestionService $questions) {}

    public function store(StoreAnswerRequest $request, Question $question): AnswerResource
    {
        $answer = $this->questions->answer($question, $request->user(), $request->validated('body'));
        $answer->load('author')->setRelation('question', $question);

        return new AnswerResource($answer);
    }

    public function update(Request $request, Answer $answer, PostEditingService $editing): AnswerResource
    {
        $data = $request->validate(['body' => ['required', 'string', 'min:20', 'max:20000']]);
        $editing->updateAnswer($answer, $request->user(), $data['body']);
        $answer->load(['author', 'question']);

        return new AnswerResource($answer);
    }

    public function destroy(Request $request, Answer $answer, PostEditingService $editing): JsonResponse
    {
        $editing->deleteAnswer($answer, $request->user());

        return response()->json(['message' => __('Réponse supprimée.')]);
    }

    /** Valide une réponse et verse la prime éventuelle */
    public function accept(Request $request, Question $question, Answer $answer): JsonResponse
    {
        ['recipient' => $recipient, 'bounty' => $bounty] = $this->questions->accept($question, $answer, $request->user());

        return response()->json([
            'recipient' => new UserResource($recipient),
            'bountyPaid' => $bounty ? new BountyResource($bounty) : null,
        ]);
    }
}
