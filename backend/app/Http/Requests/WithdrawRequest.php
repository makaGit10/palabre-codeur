<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class WithdrawRequest extends FormRequest
{
    public function rules(): array
    {
        $method = $this->input('method');
        $account = match (true) {
            in_array($method, config('palabre.mobile_money'), true) => ['required', 'string', 'regex:/^\+?[0-9 ]{8,18}$/'],
            $method === 'bank_transfer' => ['required', 'string', 'min:16', 'max:40'],
            default => ['nullable', 'string', 'max:40'],
        };

        return [
            'amount' => ['required', 'integer', 'min:1'],
            'method' => ['required', 'string'],
            'account' => $account,
        ];
    }

    public function messages(): array
    {
        return ['account.regex' => 'Entrez un numéro de téléphone valide (8 à 15 chiffres).'];
    }
}
