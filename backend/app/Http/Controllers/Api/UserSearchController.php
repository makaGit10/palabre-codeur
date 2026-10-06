<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/** Recherche de membres par nom : mentions @, création de groupes */
class UserSearchController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $q = trim((string) $request->validate(['q' => ['nullable', 'string', 'max:80']])['q'] ?? '');
        $like = '%'.addcslashes($q, '%_\\').'%';
        $users = User::query()
            ->when($q !== '', fn ($query) => $query->where('name', 'ilike', $like))
            ->whereKeyNot($request->user()->id)
            ->orderByDesc('reputation')
            ->limit(8)
            ->get();

        return UserResource::collection($users);
    }
}
