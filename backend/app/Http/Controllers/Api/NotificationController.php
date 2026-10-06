<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

class NotificationController extends Controller
{
    /** Les 30 dernières notifications et le nombre de non-lues (pour la cloche) */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $notifications = $user->notifications()->latest()->limit(30)->get()->map(fn (DatabaseNotification $n) => [
            'id' => $n->id,
            'kind' => $n->data['kind'] ?? 'info',
            'title' => $n->data['title'] ?? '',
            'body' => $n->data['body'] ?? '',
            'url' => $n->data['url'] ?? null,
            'readAt' => $n->read_at?->toIso8601String(),
            'createdAt' => $n->created_at->toIso8601String(),
        ]);

        return response()->json(['data' => $notifications, 'unreadCount' => $user->unreadNotifications()->count()]);
    }

    public function readAll(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['unreadCount' => 0]);
    }
}
