<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MessagingService;
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
            'url' => $n->data['url'] ?? null,
            'readAt' => $n->read_at?->toIso8601String(),
            'createdAt' => $n->created_at->toIso8601String(),
        ] + self::render($n->data));

        return response()->json(['data' => $notifications, 'unreadCount' => $user->unreadNotifications()->count()]);
    }

    public function readAll(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['unreadCount' => 0]);
    }

    /**
     * Titre et texte composés à la lecture, dans la langue de la personne, à partir des éléments enregistrés.
     *
     * @return array{title: string, body: string}
     */
    private static function render(array $data): array
    {
        $amount = number_format((int) ($data['amount'] ?? 0), 0, ',', app()->getLocale() === 'fr' ? ' ' : ',');

        return match ($data['kind'] ?? 'info') {
            'answer' => ['title' => __(':author a répondu à votre question', ['author' => $data['author'] ?? '']), 'body' => $data['question'] ?? ''],
            'accepted' => ['title' => __('Votre réponse a été validée'), 'body' => $data['question'] ?? ''],
            'bounty' => ['title' => __('Votre réponse a été validée · :amount FCFA versés dans votre portefeuille', ['amount' => $amount]), 'body' => $data['question'] ?? ''],
            'topup' => ['title' => __(':amount FCFA sont arrivés sur votre portefeuille', ['amount' => $amount]), 'body' => __('Recharge confirmée par PayTech.')],
            'message' => ['title' => __('Nouveau message de :sender', ['sender' => $data['sender'] ?? '']), 'body' => MessagingService::previewText($data)],
            'mention' => ['title' => __(':author vous a mentionné dans :room', ['author' => $data['author'] ?? '', 'room' => $data['room'] ?? '']), 'body' => MessagingService::previewText($data)],
            default => ['title' => $data['title'] ?? '', 'body' => $data['body'] ?? ''],
        };
    }
}
