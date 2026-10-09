<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Payments\PaytechClient;
use App\Services\TopupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TopupController extends Controller
{
    public function __construct(private readonly TopupService $topups, private readonly PaytechClient $paytech) {}

    /** Démarre une recharge : renvoie l'adresse de paiement PayTech, ou « paid » directement en mode test */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['amount' => ['required', 'integer']]);
        $result = $this->topups->start($request->user(), (int) $data['amount']);

        return response()->json([
            'status' => $result['status'],
            'redirectUrl' => $result['redirectUrl'],
            'reference' => $result['topup']->reference,
            'testMode' => ! $this->paytech->configured(),
        ], 201);
    }

    /**
     * Notification de paiement envoyée par PayTech (IPN). Authentifiée par l'empreinte de nos clés ;
     * le montant payé doit correspondre exactement à la recharge, qui n'est créditée qu'une fois.
     */
    public function ipn(Request $request): JsonResponse
    {
        $payload = $request->all();
        if (! $this->paytech->isAuthentic($payload)) {
            Log::warning('IPN PayTech refusée : empreinte des clés invalide', ['ip' => $request->ip()]);

            return response()->json(['message' => 'Forbidden'], 403);
        }

        $reference = (string) ($payload['ref_command'] ?? '');
        match ($payload['type_event'] ?? null) {
            'sale_complete' => $this->topups->confirm($reference, (int) ($payload['item_price'] ?? $payload['final_item_price'] ?? 0), $payload['payment_method'] ?? null, $payload['token'] ?? null),
            'sale_canceled' => $this->topups->cancel($reference),
            default => null,
        };

        return response()->json(['message' => 'OK']);
    }
}
