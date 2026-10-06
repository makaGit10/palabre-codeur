<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AiFeedbackRequest extends FormRequest
{
    public function rules(): array
    {
        return ['value' => ['required', 'in:up,down']];
    }
}
