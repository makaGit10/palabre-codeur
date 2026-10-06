<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AddMembersRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'members' => ['required', 'array', 'min:1', 'max:49'],
            'members.*' => ['integer', Rule::exists('users', 'id')],
        ];
    }
}
