<?php

namespace App\Http\Requests;

use App\DTOs\ScheduleExamData;
use Illuminate\Foundation\Http\FormRequest;

class ScheduleExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $raw = $this->json()->all();
        if (empty($raw)) {
            $content = $this->getContent();
            if (!empty($content)) {
                $decoded = json_decode($content, true);
                if (is_array($decoded)) {
                    $this->merge($decoded);
                }
            }
        }

        $this->merge([
            'title' => $this->input('title') ?? $this->input('tipo_examen') ?? $this->input('tipoExamen'),
            'date' => $this->input('date') ?? $this->input('fecha'),
            'start_time' => $this->input('start_time') ?? $this->input('hora_inicio') ?? $this->input('horaInicio'),
            'end_time' => $this->input('end_time') ?? $this->input('hora_fin') ?? $this->input('horaFin'),
            'classrooms' => $this->input('classrooms') ?? $this->input('aulas') ?? [],
            'rules' => $this->input('rules') ?? $this->input('normas') ?? [],
        ]);
    }

    public function rules(): array
    {
        return [
            'title' => [
                'required',
                'string',
                'max:150',
            ],
            'date' => [
                'required',
                'date',
            ],
            'start_time' => [
                'required',
                'string',
            ],
            'end_time' => [
                'required',
                'string',
            ],
            'classrooms' => [
                'nullable',
                'array',
            ],
            'classrooms.*' => [
                'string',
            ],
            'rules' => [
                'nullable',
                'array',
            ],
            'rules.*' => [
                'string',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'El tipo de examen es obligatorio.',
            'title.string' => 'El tipo de examen debe ser texto.',
            'date.required' => 'La fecha del examen es obligatoria.',
            'date.date' => 'La fecha del examen no tiene un formato válido.',
            'start_time.required' => 'La hora de inicio es obligatoria.',
            'end_time.required' => 'La hora de finalización es obligatoria.',
            'classrooms.array' => 'Las aulas deben ser un arreglo.',
            'rules.array' => 'Las normas deben ser un arreglo.',
        ];
    }

    public function toDTO(): ScheduleExamData
    {
        return new ScheduleExamData(
            title: (string) $this->input('title'),
            date: (string) $this->input('date'),
            startTime: (string) $this->input('start_time'),
            endTime: (string) $this->input('end_time'),
            classrooms: (array) ($this->input('classrooms') ?? []),
            rules: (array) ($this->input('rules') ?? [])
        );
    }
}
