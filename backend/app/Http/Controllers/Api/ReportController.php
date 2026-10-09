<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Services\ModerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Un membre signale une question, une réponse ou un snippet */
class ReportController extends Controller
{
    public function __construct(private readonly ModerationService $moderation) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(array_keys(Report::TYPES))],
            'id' => ['required', 'integer'],
            'reason' => ['required', Rule::in(Report::REASONS)],
            'details' => ['nullable', 'string', 'max:500'],
        ]);
        $this->moderation->report($request->user(), $data['type'], (int) $data['id'], $data['reason'], $data['details'] ?? null);

        return response()->json(['message' => __('Merci : le signalement a été transmis à la modération.')], 201);
    }
}
