<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AiFeedbackRequest;
use App\Models\AiFeedback;
use App\Models\AiSuggestion;
use Illuminate\Http\JsonResponse;

class AiFeedbackController extends Controller
{
    /** Avis « utile » ou « erreur » sur une suggestion de l'IA */
    public function store(AiFeedbackRequest $request, AiSuggestion $suggestion): JsonResponse
    {
        AiFeedback::updateOrCreate(
            ['ai_suggestion_id' => $suggestion->id, 'user_id' => $request->user()->id],
            ['value' => $request->validated('value')],
        );

        return response()->json(['feedback' => $request->validated('value')]);
    }
}
