<?php

namespace App\DTOs;

class ExamSummary
{
    /**
     * @param int $id
     * @param string $courseGroupId
     * @param string $title
     * @param string $date
     * @param string $startTime
     * @param string $endTime
     * @param string $status
     * @param array<string> $classrooms
     * @param array<string> $rules
     */
    public function __construct(
        public readonly int $id,
        public readonly string $courseGroupId,
        public readonly string $title,
        public readonly string $date,
        public readonly string $startTime,
        public readonly string $endTime,
        public readonly string $status,
        public readonly array $classrooms = [],
        public readonly array $rules = []
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'course_group_id' => $this->courseGroupId,
            'title' => $this->title,
            'titulo' => $this->title,
            'date' => $this->date,
            'fecha' => $this->date,
            'start_time' => $this->startTime,
            'hora_inicio' => $this->startTime,
            'end_time' => $this->endTime,
            'hora_fin' => $this->endTime,
            'status' => $this->status,
            'estado' => $this->status,
            'aulas' => $this->classrooms,
            'normas' => $this->rules,
        ];
    }
}
