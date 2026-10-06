<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGroupRequest extends FormRequest
{
    public function rules(): array
    {
        $max = config('palabre.messages.max_group_members') - 1;

        return [
            'name' => ['required', 'string', 'min:2', 'max:60'],
            'members' => ['required', 'array', 'min:1', "max:{$max}"],
            'members.*' => ['integer', Rule::exists('users', 'id')],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['name' => trim((string) $this->input('name'))]);
    }
}
