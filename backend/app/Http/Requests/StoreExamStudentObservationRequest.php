<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreExamStudentObservationRequest extends FormRequest
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

        if ($this->has('observation')) {
            $this->merge([
                'observation' => trim((string) $this->input('observation')),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'identifier' => ['required', 'string', 'max:50'],
            'exam_id' => ['required', 'integer', 'exists:examen,id'],
            'observation' => ['required', 'string', 'max:5000'],
        ];
    }

    public function messages(): array
    {
        return [
            'identifier.required' => 'El código SIS o CI es obligatorio.',
            'exam_id.required' => 'El examen es obligatorio.',
            'exam_id.exists' => 'El examen no existe.',
            'observation.required' => 'La observación es obligatoria.',
            'observation.max' => 'La observación no puede exceder los 5000 caracteres.',
        ];
    }
}
