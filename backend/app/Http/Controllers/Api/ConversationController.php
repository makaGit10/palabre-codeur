<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMessageRequest;
use App\Http\Resources\DirectMessageResource;
use App\Http\Resources\UserResource;
use App\Models\Conversation;
use App\Models\User;
use App\Services\MessagingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ConversationController extends Controller
{
    public function __construct(private readonly MessagingService $messaging) {}

    /** Mes conversations, avec l'autre personne, le dernier message et les non-lus */
    public function index(Request $request): JsonResponse
    {
        $me = $request->user();
        $conversations = $this->messaging->conversationsFor($me)->map(fn (Conversation $c) => [
            'id' => $c->id,
            'user' => new UserResource($c->otherParticipant($me)),
            'lastMessage' => $c->latestMessage ? [
                'body' => Str::limit(MessagingService::preview($c->latestMessage), 90),
                'mine' => $c->latestMessage->sender_id === $me->id,
                'createdAt' => $c->latestMessage->created_at->toIso8601String(),
            ] : null,
            'unreadCount' => (int) $c->unread_count,
        ]);

        return response()->json(['data' => $conversations, 'unreadCount' => $this->messaging->unreadMessagesCount($me)]);
    }

    /** Fil avec une personne (vide si aucun échange encore) ; les messages reçus passent en « lus » */
    public function show(Request $request, User $user): JsonResponse
    {
        $me = $request->user();
        if ($user->id === $me->id) {
            throw new BusinessRuleException(__('Vous ne pouvez pas vous écrire à vous-même.'));
        }

        return response()->json([
            'user' => new UserResource($user),
            'messages' => DirectMessageResource::collection($this->messaging->thread($me, $user)),
        ]);
    }

    public function store(StoreMessageRequest $request, User $user): JsonResponse
    {
        ['body' => $body, 'attachment' => $attachment] = $request->payload();
        $message = $this->messaging->send($request->user(), $user, $body, $attachment);

        return response()->json(new DirectMessageResource($message), 201);
    }
}
