<?php

namespace App\Payments;

use App\Exceptions\BusinessRuleException;
use App\Models\WalletTopup;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * PayTech (paytech.sn) : demande de paiement et vérification des notifications (IPN).
 * Les clés restent dans .env (PAYTECH_API_KEY, PAYTECH_API_SECRET) ; sans elles, Palabre reste en mode test.
 */
class PaytechClient
{
    public function configured(): bool
    {
        return filled(config('palabre.paytech.api_key')) && filled(config('palabre.paytech.api_secret'));
    }

    /**
     * Crée la demande de paiement chez PayTech et renvoie l'adresse de la page de paiement.
     *
     * @return array{token: string, redirect_url: string}
     */
    public function requestPayment(WalletTopup $topup): array
    {
        $api = rtrim((string) config('app.url'), '/');
        $front = rtrim((string) config('palabre.frontend_url'), '/');

        try {
            $response = Http::timeout(20)
                ->withHeaders(['API_KEY' => config('palabre.paytech.api_key'), 'API_SECRET' => config('palabre.paytech.api_secret')])
                ->acceptJson()
                ->post(rtrim(config('palabre.paytech.base_url'), '/').'/payment/request-payment', [
                    'item_name' => 'Recharge du portefeuille Palabre',
                    'item_price' => $topup->amount,
                    'currency' => 'XOF',
                    'ref_command' => $topup->reference,
                    'command_name' => "Recharge Palabre de {$topup->amount} FCFA",
                    'env' => config('palabre.paytech.env'),
                    'ipn_url' => $api.'/api/paytech/ipn',
                    'success_url' => $front.'/app/portefeuille?recharge=ok',
                    'cancel_url' => $front.'/app/portefeuille?recharge=annulee',
                    'custom_field' => json_encode(['topup' => $topup->id]),
                ]);
        } catch (Throwable $e) {
            Log::error('PayTech injoignable : '.$e->getMessage());
            throw new BusinessRuleException(__('Le service de paiement ne répond pas. Réessayez dans quelques instants.'), 503);
        }

        $data = $response->json() ?? [];
        $url = $data['redirect_url'] ?? $data['redirectUrl'] ?? null;
        if (! $response->successful() || (int) ($data['success'] ?? 0) !== 1 || ! $url) {
            Log::error('PayTech a refusé la demande de paiement', ['status' => $response->status(), 'body' => $data]);
            throw new BusinessRuleException(__('Le paiement n\'a pas pu être préparé. Réessayez dans quelques instants.'), 502);
        }

        return ['token' => (string) ($data['token'] ?? ''), 'redirect_url' => $url];
    }

    /** Une notification IPN vient de PayTech si elle porte l'empreinte SHA-256 de nos deux clés */
    public function isAuthentic(array $payload): bool
    {
        if (! $this->configured()) {
            return false;
        }

        return hash_equals(hash('sha256', (string) config('palabre.paytech.api_key')), (string) ($payload['api_key_sha256'] ?? ''))
            && hash_equals(hash('sha256', (string) config('palabre.paytech.api_secret')), (string) ($payload['api_secret_sha256'] ?? ''));
    }
}
