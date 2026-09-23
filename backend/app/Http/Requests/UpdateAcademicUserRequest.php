<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAcademicUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fullName' => [
                'required',
                'string',
                'max:150',
            ],

            'email' => [
                'required',
                'email',
            ],

            'role' => [
                'required',
                'string',
                'in:DOCENTE,AUXILIAR,ADMIN',
            ],

            'newPassword' => [
                'nullable',
                'string',
                'min:8',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'fullName.required' => 'El nombre completo es obligatorio.',
            'fullName.string' => 'El nombre debe ser texto.',
            'fullName.max' => 'El nombre no puede exceder los 150 caracteres.',

            'email.required' => 'El correo es obligatorio.',
            'email.email' => 'El correo no tiene un formato válido.',

            'role.required' => 'El rol es obligatorio.',
            'role.in' => 'El rol seleccionado no es válido.',

            'newPassword.min' => 'La nueva contraseña debe tener mínimo 8 caracteres.',
        ];
    }
}
