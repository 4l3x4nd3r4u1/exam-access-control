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
            'nombreCompleto' => [
                'required',
                'string',
                'max:150',
            ],

            'email' => [
                'required',
                'email',
            ],

            'passwordProvisional' => [
                'required',
                'string',
                'min:8',
            ],

            'rol' => [
                'required',
                'string',
                'in:DOCENTE,AUXILIAR,ADMIN',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'nombreCompleto.required' => 'El nombre completo es obligatorio.',
            'nombreCompleto.string' => 'El nombre debe ser texto.',

            'email.required' => 'El correo es obligatorio.',
            'email.email' => 'El correo no tiene un formato válido.',

            'passwordProvisional.required' => 'La contraseña provisional es obligatoria.',
            'passwordProvisional.min' => 'La contraseña debe tener mínimo 8 caracteres.',

            'rol.required' => 'El rol es obligatorio.',
            'rol.in' => 'El rol seleccionado no es válido.',
        ];
    }
}