<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAnswerRequest extends FormRequest
{
    public function rules(): array
    {
        return ['body' => ['required', 'string', 'min:20', 'max:20000']];
    }
}
