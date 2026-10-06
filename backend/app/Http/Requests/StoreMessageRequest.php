<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/** Un message contient du texte, une pièce jointe (question ou extrait partagé), ou les deux ; et des mentions @ */
class StoreMessageRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'body' => ['nullable', 'string', 'max:2000'],
            'attachment' => ['nullable', 'array'],
            'attachment.type' => ['required_with:attachment', Rule::in(['question', 'snippet'])],
            'attachment.id' => [
                'required_with:attachment',
                'integer',
                Rule::exists($this->input('attachment.type') === 'snippet' ? 'snippets' : 'questions', 'id'),
            ],
            'mentions' => ['nullable', 'array', 'max:10'],
            'mentions.*' => ['integer', Rule::exists('users', 'id')],
        ];
    }

    public function messages(): array
    {
        return ['attachment.id.exists' => "Ce que vous voulez partager n'existe plus."];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['body' => trim((string) $this->input('body'))]);
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if ($this->input('body') === '' && ! $this->input('attachment')) {
                $validator->errors()->add('body', 'Écrivez un message ou partagez quelque chose.');
            }
        }];
    }

    /** @return array{body: string, attachment: array{type: string, id: int}|null, mentions: list<int>} */
    public function payload(): array
    {
        $attachment = $this->validated('attachment');

        return [
            'body' => (string) $this->validated('body'),
            'attachment' => $attachment ? ['type' => $attachment['type'], 'id' => (int) $attachment['id']] : null,
            'mentions' => array_map('intval', $this->validated('mentions') ?? []),
        ];
    }
}
