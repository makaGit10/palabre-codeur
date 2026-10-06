<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSnippetRequest;
use App\Http\Resources\SnippetResource;
use App\Models\Snippet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SnippetController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $viewer = $request->user('sanctum');
        $snippets = Snippet::query()
            ->with('author')
            ->withCount('testers')
            ->when($viewer, fn ($q) => $q->withExists(['testers as tested_by_me' => fn ($t) => $t->whereKey($viewer->id)]))
            ->latest()
            ->limit(100)
            ->get();

        return SnippetResource::collection($snippets);
    }

    public function store(StoreSnippetRequest $request): SnippetResource
    {
        $data = $request->validated();
        $snippet = new Snippet([...$data, 'apis' => $data['tags']]);
        $snippet->author()->associate($request->user())->save();

        return new SnippetResource($snippet->load('author')->loadCount('testers'));
    }

    /** Ajoute ou retire la confirmation « testé » de la personne connectée */
    public function toggleTested(Request $request, Snippet $snippet): JsonResponse
    {
        $result = $snippet->testers()->toggle($request->user()->id);

        return response()->json([
            'testedByMe' => count($result['attached']) > 0,
            'testedBy' => $snippet->testers()->count(),
        ]);
    }
}
