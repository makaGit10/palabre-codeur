<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMessageRequest;
use App\Http\Resources\RoomMessageResource;
use App\Models\Room;
use App\Services\MessagingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class RoomController extends Controller
{
    public function __construct(private readonly MessagingService $messaging) {}

    /** Salons publics (et, pour un membre connecté, ses groupes), avec compteurs et aperçu du dernier message */
    public function index(Request $request): JsonResponse
    {
        $rooms = $this->messaging->roomsFor($request->user('sanctum'))->map(fn (Room $room) => [
            'id' => $room->id,
            'slug' => $room->slug,
            'name' => $room->name,
            'kind' => $room->kind,
            'country' => $room->country,
            'isPrivate' => $room->is_private,
            'description' => $room->description,
            'messagesCount' => $room->messages_count,
            'membersCount' => $room->is_private ? $room->members_count : null,
            'unreadCount' => $room->is_private ? (int) ($room->unread_count ?? 0) : 0,
            'lastMessage' => $room->latestMessage ? [
                'body' => Str::limit(MessagingService::preview($room->latestMessage), 70),
                'authorName' => $room->latestMessage->author->name,
                'createdAt' => $room->latestMessage->created_at->toIso8601String(),
            ] : null,
        ]);

        return response()->json(['data' => $rooms]);
    }

    /** Les 50 derniers messages d'un salon, ou seulement les nouveaux depuis ?after=<id> (rafraîchissement) */
    public function messages(Request $request, Room $room): AnonymousResourceCollection
    {
        $viewer = $request->user('sanctum');
        abort_unless($room->canBeReadBy($viewer), 403, __('Ce groupe est réservé à ses membres.'));
        if ($viewer) {
            $this->messaging->markRead($room, $viewer);
        }

        $after = (int) $request->query('after', 0);
        $query = $room->messages()->with(['author', 'reactions']);
        $messages = $after > 0
            ? $query->where('id', '>', $after)->orderBy('id')->limit(100)->get()
            : $query->orderByDesc('id')->limit(50)->get()->reverse()->values();

        return RoomMessageResource::collection($messages);
    }

    public function store(StoreMessageRequest $request, Room $room): RoomMessageResource
    {
        ['body' => $body, 'attachment' => $attachment, 'mentions' => $mentions] = $request->payload();
        $message = $this->messaging->postToRoom($room, $request->user(), $body, $attachment, $mentions);

        return new RoomMessageResource($message->load(['author', 'reactions']));
    }
}
