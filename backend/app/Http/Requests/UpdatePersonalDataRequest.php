<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePersonalDataRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fullName' => 'required|string|max:150',
            'ci' => 'nullable|string|max:30|unique:usuario,ci,' . $this->user()->id,
            'newPassword' => 'nullable|string|min:8',
        ];
    }

    public function messages(): array
    {
        return [
            'fullName.required' => 'El nombre completo es obligatorio.',
            'ci.unique' => 'El CI ya está registrado.',
            'newPassword.min' => 'La nueva contraseña debe tener mínimo 8 caracteres.',
        ];
    }
}
