<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

// Règle métier non respectée (ex. retirer plus que son solde) : réponse 422 avec un message clair en français
class BusinessRuleException extends Exception
{
    public function __construct(string $message, private readonly int $status = 422)
    {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage()], $this->status);
    }
}
