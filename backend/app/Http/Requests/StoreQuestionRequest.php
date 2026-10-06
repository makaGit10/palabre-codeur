<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreQuestionRequest extends FormRequest
{
    public function rules(): array
    {
        $methods = collect(config('palabre.countries'))->pluck('methods')->flatten()->unique()->all();

        return [
            'title' => ['required', 'string', 'min:15', 'max:200'],
            'body' => ['required', 'string', 'min:20', 'max:20000'],
            'tags' => ['required', 'array', 'min:1', 'max:4'],
            'tags.*' => ['string', 'regex:/^[a-z0-9-]{1,40}$/'],
            'bounty' => ['nullable', 'array'],
            'bounty.amount' => ['required_with:bounty', 'integer', Rule::in(config('palabre.bounty.amounts'))],
            'bounty.method' => ['required_with:bounty', 'string', Rule::in($methods)],
        ];
    }
}
