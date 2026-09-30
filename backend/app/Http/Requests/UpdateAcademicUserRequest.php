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

            'roles' => [
                'required',
                'array',
                'min:1',
            ],
            'roles.*' => [
                'string',
                'in:DOCENTE,AUXILIAR,ADMIN',
            ],

            'newPassword' => [
                'nullable',
                'string',
                'min:8',
            ],

            'ci' => [
                'nullable',
                'string',
                'max:30',
                'unique:usuario,ci',
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

            'roles.required' => 'Debe seleccionar al menos un rol.',
            'roles.*.in' => 'Uno o más roles seleccionados no son válidos.',

            'newPassword.min' => 'La nueva contraseña debe tener mínimo 8 caracteres.',
        ];
    }
}
