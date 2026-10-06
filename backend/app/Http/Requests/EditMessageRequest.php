<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EditMessageRequest extends FormRequest
{
    public function rules(): array
    {
        return ['body' => ['required', 'string', 'min:1', 'max:2000']];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['body' => trim((string) $this->input('body'))]);
    }
}
