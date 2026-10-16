<?php

namespace App\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSnippetRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:10', 'max:150'],
            'description' => ['required', 'string', 'min:15', 'max:300'],
            'language' => ['required', 'string', 'max:60'],
            'fence' => ['required', 'string', 'regex:/^[a-z0-9+#-]{1,30}$/'],
            'tags' => ['required', 'array', 'min:1', 'max:6'],
            'tags.*' => ['string', 'regex:/^[a-z0-9-]{1,40}$/'],
            // Passeport de fiabilité (facultatif) ; licences permissives seulement, comme le reste du projet
            'api_version' => ['nullable', 'string', 'max:120'],
            'requirements' => ['nullable', 'string', 'max:500'],
            'environment' => ['nullable', 'string', 'max:160'],
            'license' => ['nullable', Rule::in(['MIT', 'Apache-2.0', 'BSD-3-Clause', 'CC0-1.0'])],
            'limitations' => ['nullable', 'string', 'max:500'],
            'code' => ['required', 'string', 'max:10000', function (string $attribute, mixed $value, Closure $fail) {
                if (count(explode("\n", trim((string) $value))) < 2) {
                    $fail('Collez au moins 2 lignes de code.');
                }
            }],
        ];
    }
}
