<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CheckDuringExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('identifier')) {
            $this->merge([
                'identifier' => trim((string) $this->input('identifier')),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'identifier' => ['required', 'string', 'max:50'],
            'exam_id' => ['required', 'integer', 'exists:examen,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'identifier.required' => 'El código SIS o CI es obligatorio.',
            'exam_id.required' => 'El examen es obligatorio.',
            'exam_id.exists' => 'El examen no existe.',
        ];
    }
}
