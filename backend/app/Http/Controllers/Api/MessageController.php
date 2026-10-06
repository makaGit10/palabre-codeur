<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\EditMessageRequest;
use App\Http\Resources\DirectMessageResource;
use App\Http\Resources\RoomMessageResource;
use App\Models\DirectMessage;
use App\Models\RoomMessage;
use App\Models\User;
use App\Services\MessagingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Validation\Rule;

/** Actions communes aux messages de salon (type « room ») et privés (type « direct ») : modifier, supprimer, réagir */
class MessageController extends Controller
{
    public function __construct(private readonly MessagingService $messaging) {}

    public function update(EditMessageRequest $request, string $type, int $id): JsonResource
    {
        $message = $this->resolve($type, $id, $request->user());
        $this->messaging->edit($message, $request->user(), $request->validated('body'));

        return $this->resource($message->refresh());
    }

    public function destroy(Request $request, string $type, int $id): JsonResource
    {
        $message = $this->resolve($type, $id, $request->user());
        $this->messaging->delete($message, $request->user());

        return $this->resource($message->refresh());
    }

    public function react(Request $request, string $type, int $id): JsonResponse
    {
        $emoji = $request->validate(['emoji' => ['required', 'string', Rule::in(config('palabre.messages.reactions'))]])['emoji'];
        $message = $this->resolve($type, $id, $request->user());
        $added = $this->messaging->toggleReaction($message, $request->user(), $emoji);

        return response()->json(['added' => $added, 'message' => $this->resource($message->refresh())]);
    }

    /** Charge le message et vérifie que la personne a accès à son salon ou à sa conversation */
    private function resolve(string $type, int $id, User $user): RoomMessage|DirectMessage
    {
        if ($type === 'room') {
            $message = RoomMessage::with('room')->findOrFail($id);
            abort_unless($message->room->canBeWrittenBy($user), 403, 'Ce groupe est réservé à ses membres.');

            return $message;
        }
        $message = DirectMessage::with('conversation')->findOrFail($id);
        $c = $message->conversation;
        abort_unless(in_array($user->id, [$c->user_one_id, $c->user_two_id], true), 403, 'Cette conversation ne vous concerne pas.');

        return $message;
    }

    private function resource(RoomMessage|DirectMessage $message): JsonResource
    {
        return $message instanceof RoomMessage
            ? new RoomMessageResource($message->load(['author', 'reactions']))
            : new DirectMessageResource($message->load('reactions'));
    }
}
