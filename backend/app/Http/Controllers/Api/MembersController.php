<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\MemberService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Membres et rôles : administrateurs seulement (middleware « admin:manage ») */
class MembersController extends Controller
{
    public function __construct(private readonly MemberService $members) {}

    /** Liste paginée, recherche par nom ou adresse e-mail, responsables en premier */
    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q'));
        $like = '%'.addcslashes($q, '%_\\').'%';
        $page = User::query()
            ->when($q !== '', fn ($query) => $query->where(fn ($w) => $w->where('name', 'ilike', $like)->orWhere('email', 'ilike', $like)))
            ->orderByDesc('is_admin')
            ->orderByDesc('is_moderator')
            ->orderBy('name')
            ->paginate(20);

        return response()->json([
            'data' => $page->getCollection()->map(fn (User $u) => self::row($u))->values(),
            'page' => $page->currentPage(),
            'lastPage' => $page->lastPage(),
            'total' => $page->total(),
        ]);
    }

    public function setRole(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['role' => ['required', Rule::in(MemberService::ROLES)]]);
        $this->members->setRole($request->user(), $user, $data['role']);

        return response()->json(['data' => self::row($user->refresh())]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->merge(['email' => mb_strtolower(trim((string) $request->input('email')))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
            'country' => ['required', 'string', Rule::in(array_keys(config('palabre.countries')))],
            'city' => ['nullable', 'string', 'max:80'],
            'role' => ['required', Rule::in(MemberService::ROLES)],
        ], ['email.unique' => __('Un compte existe déjà avec cette adresse e-mail.')]);

        return response()->json(['data' => self::row($this->members->create($request->user(), $data))], 201);
    }

    /** Ce que l'administration voit d'un membre (l'e-mail n'apparaît nulle part ailleurs) */
    public static function row(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'country' => $u->country,
            'city' => $u->city,
            'role' => MemberService::roleOf($u),
            'reputation' => $u->reputation,
            'bountyEarnings' => $u->bounty_earnings,
            'emailVerified' => $u->email_verified_at !== null,
            'createdAt' => $u->created_at->toIso8601String(),
        ];
    }
}
