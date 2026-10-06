<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Recherche globale (barre Ctrl+K) : résultats groupés par section */
class SearchController extends Controller
{
    public function __invoke(Request $request, SearchService $search): JsonResponse
    {
        $q = trim((string) $request->validate(['q' => ['required', 'string', 'min:2', 'max:80']])['q']);

        return response()->json(['query' => $q, 'sections' => $search->search($q, $request->user('sanctum'))]);
    }
}
