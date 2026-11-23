<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreExamInvitationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check()
            && auth()->user()->hasFunction('INVITAR_DOCENTE_EXAMEN');
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'invited_teacher_id' => $this->input(
                'invited_teacher_id',
                $this->input('invitedTeacherId')
            ),
        ]);
    }

    public function rules(): array
    {
        return [
            'invited_teacher_id' => [
                'required',
                'integer',
                'exists:usuario,id',
            ],
            'message' => ['required', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'invited_teacher_id.required' => 'Debes seleccionar un docente.',
            'invited_teacher_id.exists' => 'El docente seleccionado no existe.',
            'message.required' => 'Debes escribir un mensaje para la invitación.',
            'message.max' => 'El mensaje no puede superar los 1000 caracteres.',
        ];
    }
}
