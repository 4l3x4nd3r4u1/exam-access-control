<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CheckExamAccessRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'identifier' => ['required', 'string', 'max:50'],
            'exam_id' => ['required', 'integer', 'exists:examen,id'],
            'room_id' => ['required', 'integer', 'exists:aula,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'identifier.required' => 'El código SIS o CI es obligatorio.',
            'exam_id.required' => 'El examen es obligatorio.',
            'exam_id.exists' => 'El examen no existe.',
            'room_id.required' => 'El aula es obligatoria.',
            'room_id.exists' => 'El aula no existe.',
        ];
    }
}
