<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'identifier' => [
                'required_without:email',
                'string',
                'max:150',
                'prohibits:email',
            ],
            'email' => [
                'required_without:identifier',
                'email',
                'max:150',
            ],
            'password' => [
                'required',
                'string',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'identifier.required_without' => 'El CI o correo es obligatorio.',
            'identifier.string' => 'El CI o correo debe ser un texto.',
            'identifier.max' => 'El CI o correo no debe superar los 150 caracteres.',
            'identifier.prohibits' => 'Envía solo identifier o email, no ambos.',
            'email.required' => 'El correo es obligatorio.',
            'email.required_without' => 'El CI o correo es obligatorio.',
            'email.email' => 'El correo no tiene un formato válido.',
            'password.required' => 'La contraseña es obligatoria.',
        ];
    }
}
