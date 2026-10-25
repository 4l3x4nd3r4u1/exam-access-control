<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterExamStudentExpulsionRequest extends FormRequest
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

        if ($this->has('reason')) {
            $this->merge([
                'reason' => trim((string) $this->input('reason')),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'identifier' => ['required', 'string', 'max:50'],
            'exam_id' => ['required', 'integer', 'exists:examen,id'],
            'reason' => ['required', 'string', 'max:5000'],
        ];
    }

    public function messages(): array
    {
        return [
            'identifier.required' => 'El código SIS o CI es obligatorio.',
            'exam_id.required' => 'El examen es obligatorio.',
            'exam_id.exists' => 'El examen no existe.',
            'reason.required' => 'El motivo de expulsión es obligatorio.',
            'reason.max' => 'El motivo no puede exceder los 5000 caracteres.',
        ];
    }
}
