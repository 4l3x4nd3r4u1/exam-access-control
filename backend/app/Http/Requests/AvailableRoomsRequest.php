<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AvailableRoomsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date' => 'required|date_format:Y-m-d',
            'startTime' => 'required|date_format:H:i',
        ];
    }

    public function messages(): array
    {
        return [
            'date.required' => 'La fecha es obligatoria.',
            'date.date_format' => 'La fecha debe tener formato YYYY-MM-DD.',
            'startTime.required' => 'La hora de inicio es obligatoria.',
            'startTime.date_format' => 'La hora debe tener formato HH:MM.',
        ];
    }
}
