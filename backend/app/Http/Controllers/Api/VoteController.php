<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\VoteRequest;
use App\Models\Answer;
use App\Models\Question;
use App\Services\VoteService;
use Illuminate\Http\JsonResponse;

class VoteController extends Controller
{
    public function __construct(private readonly VoteService $votes) {}

    public function question(VoteRequest $request, Question $question): JsonResponse
    {
        return $this->cast($request, $question);
    }

    public function answer(VoteRequest $request, Answer $answer): JsonResponse
    {
        return $this->cast($request, $answer);
    }

    private function cast(VoteRequest $request, Question|Answer $votable): JsonResponse
    {
        $value = (int) $request->validated('value');
        $score = $this->votes->cast($request->user(), $votable, $value);

        return response()->json(['votes' => $score, 'myVote' => $value]);
    }
}
