<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
//Su principar funcionalidad es poder validar 
//La entrada HTTP
class RegisterAcademicUserRequest extends FormRequest
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

            'password' => [
                'required',
                'string',
                'min:8',
            ],

            'role' => [
                'required',
                'string',
                'in:DOCENTE,AUXILIAR,ADMIN',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'fullName.required' => 'El nombre completo es obligatorio.',
            'fullName.string' => 'El nombre debe ser texto.',

            'email.required' => 'El correo es obligatorio.',
            'email.email' => 'El correo no tiene un formato válido.',

            'password.required' => 'La contraseña provisional es obligatoria.',
            'password.min' => 'La contraseña debe tener mínimo 8 caracteres.',

            'role.required' => 'El rol es obligatorio.',
            'role.in' => 'El rol seleccionado no es válido.',
        ];
    }
}