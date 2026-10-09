<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Services\ModerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/** Espace de modération, réservé aux administrateurs (vérifié par le middleware « admin ») */
class ModerationController extends Controller
{
    public function __construct(private readonly ModerationService $moderation) {}

    /** Signalements regroupés par contenu : les ouverts d'abord, puis les derniers traités */
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status') === 'closed' ? 'closed' : 'open';
        $reports = Report::query()
            ->with('reporter:id,name')
            ->when($status === 'open', fn ($q) => $q->where('status', 'open'), fn ($q) => $q->where('status', '!=', 'open'))
            ->latest()
            ->limit(200)
            ->get()
            ->groupBy(fn (Report $r) => "{$r->reportable_type}:{$r->reportable_id}");

        $items = $reports->map(function ($group) {
            /** @var Report $first */
            $first = $group->first();
            $target = $first->target();

            return [
                'type' => $first->reportable_type,
                'id' => $first->reportable_id,
                'reportId' => $first->id,
                'status' => $first->status,
                'hidden' => (bool) $target?->hidden_at,
                'exists' => $target !== null,
                'title' => $target ? Str::limit((string) ($target->title ?? Str::of($target->body ?? '')->stripTags()), 120) : null,
                'excerpt' => $target ? Str::limit(trim(preg_replace('/\s+/', ' ', strip_tags((string) ($target->body ?? $target->description ?? '')))), 280) : null,
                'url' => match ($first->reportable_type) {
                    'question' => "/app/questions/{$first->reportable_id}",
                    'answer' => $target ? "/app/questions/{$target->question_id}" : null,
                    default => '/app/snippets',
                },
                'author' => $target ? DB::table('users')->where('id', $target->user_id)->value('name') : null,
                'count' => $group->count(),
                'reasons' => $group->map(fn (Report $r) => ['reason' => $r->reason, 'details' => $r->details, 'by' => $r->reporter?->name, 'at' => $r->created_at->toIso8601String()])->values(),
            ];
        })->values();

        return response()->json(['data' => $items, 'openCount' => Report::where('status', 'open')->count()]);
    }

    public function resolve(Request $request, Report $report): JsonResponse
    {
        $data = $request->validate(['decision' => ['required', Rule::in(['hide', 'dismiss'])], 'note' => ['nullable', 'string', 'max:500']]);
        $this->moderation->resolve($request->user(), $report, $data['decision'], $data['note'] ?? null);

        return response()->json(['message' => $data['decision'] === 'hide' ? __('Contenu masqué.') : __('Signalement classé sans suite.')]);
    }

    public function restore(Request $request, string $type, int $id): JsonResponse
    {
        abort_unless(array_key_exists($type, Report::TYPES), 404);
        $this->moderation->setHidden($request->user(), $type, $id, false, $request->input('note'));

        return response()->json(['message' => __('Contenu de nouveau visible.')]);
    }
}
