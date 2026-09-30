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

            'roles' => [
                'required',
                'array',
                'min:1',
            ],
            'roles.*' => [
                'string',
                'in:DOCENTE,AUXILIAR,ADMIN',
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

            'email.required' => 'El correo es obligatorio.',
            'email.email' => 'El correo no tiene un formato válido.',

            'password.required' => 'La contraseña provisional es obligatoria.',
            'password.min' => 'La contraseña debe tener mínimo 8 caracteres.',

            'roles.required' => 'Debe seleccionar al menos un rol.',
            'roles.*.in' => 'Uno o más roles seleccionados no son válidos.',

            'ci.unique' => 'El CI ya está registrado.',
        ];
    }
}