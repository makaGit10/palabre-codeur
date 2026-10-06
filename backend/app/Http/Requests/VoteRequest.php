<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class VoteRequest extends FormRequest
{
    public function rules(): array
    {
        // 1 : utile · -1 : pas utile · 0 : annuler son vote
        return ['value' => ['required', 'integer', 'in:-1,0,1']];
    }
}
