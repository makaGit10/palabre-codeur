<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\QuestionResource;
use App\Http\Resources\UserResource;
use App\Models\Bounty;
use App\Models\Question;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class CommunityController extends Controller
{
    /** Coupe des pays (somme des réputations) et meilleurs développeurs */
    public function leaderboard(): JsonResponse
    {
        $countries = User::query()
            ->selectRaw('country, SUM(reputation) AS points')
            ->groupBy('country')
            ->orderByDesc('points')
            ->get()
            ->map(fn ($row) => [
                'code' => $row->country,
                'name' => config("palabre.countries.{$row->country}.name", $row->country),
                'points' => (int) $row->points,
            ]);

        return response()->json([
            'countries' => $countries,
            'developers' => UserResource::collection(User::orderByDesc('reputation')->limit(50)->get()),
        ]);
    }

    /** Vrais chiffres affichés sur la page d'accueil */
    public function stats(): JsonResponse
    {
        return response()->json([
            'developers' => User::count(),
            'solvedQuestions' => Question::whereNotNull('accepted_answer_id')->count(),
            'countries' => User::distinct()->count('country'),
            'bountiesPaid' => (int) Bounty::where('status', Bounty::PAID)->sum('amount'),
        ]);
    }

    public function profile(User $user): JsonResponse
    {
        $activity = Question::query()
            ->with(['author', 'tags', 'bounty'])
            ->withCount('answers')
            ->where(fn ($q) => $q->where('user_id', $user->id)->orWhereHas('answers', fn ($a) => $a->where('user_id', $user->id)))
            ->latest()
            ->limit(30)
            ->get();

        return response()->json([
            'user' => new UserResource($user),
            'badges' => $user->badges()->get()->map(fn ($b) => ['icon' => $b->icon, 'label' => $b->label]),
            'questionsCount' => $user->questions()->count(),
            'answersCount' => $user->answers()->count(),
            'activity' => QuestionResource::collection($activity),
        ]);
    }
}
