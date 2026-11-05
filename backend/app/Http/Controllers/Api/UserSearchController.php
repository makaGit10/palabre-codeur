<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/** Recherche de membres par nom (mentions @, groupes, messagerie) ou par pays (« les développeurs d'ici ») */
class UserSearchController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $data = $request->validate(['q' => ['nullable', 'string', 'max:80'], 'country' => ['nullable', 'string', Rule::in(array_keys(config('palabre.countries')))]]);
        $q = trim((string) ($data['q'] ?? ''));
        $like = '%'.addcslashes($q, '%_\\').'%';
        $users = User::query()
            ->when($q !== '', fn ($query) => $query->where('name', 'ilike', $like))
            ->when(! empty($data['country']), fn ($query) => $query->where('country', $data['country']))
            ->whereKeyNot($request->user()->id)
            ->orderByDesc('reputation')
            ->limit(8)
            ->get();

        return UserResource::collection($users);
    }
}
