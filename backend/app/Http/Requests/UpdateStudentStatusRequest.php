<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStudentStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => [
                'required',
                'string',
                'in:HABILITADO,INHABILITADO',
            ],
            'reason' => [
                'required_if:status,INHABILITADO',
                'nullable',
                'string',
                'max:500',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'status.required' => 'El estado es obligatorio.',
            'status.in' => 'El estado debe ser HABILITADO o INHABILITADO.',
            'reason.required_if' => 'El motivo de inhabilitación es obligatorio.',
            'reason.max' => 'El motivo no puede exceder los 500 caracteres.',
        ];
    }
}
