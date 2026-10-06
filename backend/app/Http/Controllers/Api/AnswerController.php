<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAnswerRequest;
use App\Http\Resources\AnswerResource;
use App\Http\Resources\BountyResource;
use App\Http\Resources\UserResource;
use App\Models\Answer;
use App\Models\Question;
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
