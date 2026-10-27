<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRolesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'userId' => 'required|integer',
            'roles' => 'required|array|min:1',
            'roles.*' => 'string|in:DOCENTE,AUXILIAR,ADMIN',
        ];
    }

    public function messages(): array
    {
        return [
            'userId.required' => 'El ID de usuario es obligatorio.',
            'userId.exists' => 'El usuario no existe.',
            'roles.required' => 'Debe seleccionar al menos un rol.',
            'roles.*.in' => 'Uno o más roles seleccionados no son válidos.',
        ];
    }
}
