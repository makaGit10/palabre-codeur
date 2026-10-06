<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddMembersRequest;
use App\Http\Requests\StoreGroupRequest;
use App\Http\Resources\UserResource;
use App\Models\Room;
use App\Models\User;
use App\Services\MessagingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Groupes privés : création, membres, ajout, retrait, départ */
class GroupController extends Controller
{
    public function __construct(private readonly MessagingService $messaging) {}

    public function store(StoreGroupRequest $request): JsonResponse
    {
        $room = $this->messaging->createGroup($request->user(), $request->validated('name'), $request->validated('members'));

        return response()->json(['data' => ['id' => $room->id, 'slug' => $room->slug, 'name' => $room->name]], 201);
    }

    public function members(Request $request, Room $room): JsonResponse
    {
        abort_unless($room->canBeReadBy($request->user()), 403, 'Ce groupe est réservé à ses membres.');
        $members = $room->members()->orderBy('room_user.joined_at')->get()->map(fn (User $u) => (new UserResource($u))->resolve() + [
            'role' => $u->pivot->role,
            'joinedAt' => $u->pivot->joined_at,
        ]);

        return response()->json(['data' => $members, 'isAdmin' => $room->isAdmin($request->user())]);
    }

    public function addMembers(AddMembersRequest $request, Room $room): JsonResponse
    {
        $this->messaging->addMembers($room, $request->user(), $request->validated('members'));

        return $this->members($request, $room);
    }

    public function removeMember(Request $request, Room $room, User $user): JsonResponse
    {
        $this->messaging->removeMember($room, $request->user(), $user);

        return $this->members($request, $room);
    }

    public function leave(Request $request, Room $room): JsonResponse
    {
        $this->messaging->leave($room, $request->user());

        return response()->json(['message' => 'Vous avez quitté le groupe.']);
    }
}
