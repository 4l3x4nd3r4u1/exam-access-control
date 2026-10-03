<?php

namespace App\DTOs;

class ExamSummary
{
    /**
<<<<<<< HEAD
     * @param list<ExamRoomSummary> $rooms
     */
    public function __construct(
        public readonly string $examId,
        public readonly string $courseGroupId,
        public readonly string $examType,
        public readonly string $date,
        public readonly string $startTime,
        public readonly string $endTime,
        public readonly array $rooms = [],
    ) {}

    public function toArray(): array
    {
        return [
            'exam_id' => $this->examId,
            'course_group_id' => $this->courseGroupId,
            'exam_type' => $this->examType,
            'date' => $this->date,
            'start_time' => $this->startTime,
            'end_time' => $this->endTime,
            'rooms' => array_map(fn(ExamRoomSummary $r) => $r->toArray(), $this->rooms),
=======
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
>>>>>>> 00cff998e2fa626b462a6d86ccd700a8235ca16f
        ];
    }
}
