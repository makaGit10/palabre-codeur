<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\WithdrawRequest;
use App\Http\Resources\WalletTransactionResource;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function __construct(private readonly WalletService $wallet) {}

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'balance' => $user->wallet_balance,
            'held' => $user->wallet_held,
            'transactions' => WalletTransactionResource::collection($user->walletTransactions()->latest()->limit(100)->get()),
        ]);
    }

    public function withdraw(WithdrawRequest $request): JsonResponse
    {
        $tx = $this->wallet->withdraw(
            $request->user(),
            (int) $request->validated('amount'),
            $request->validated('method'),
            $request->validated('account'),
        );

        return response()->json(new WalletTransactionResource($tx), 201);
    }
}
