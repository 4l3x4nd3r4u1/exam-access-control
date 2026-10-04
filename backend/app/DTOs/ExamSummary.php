<?php

namespace App\DTOs;

class ExamSummary
{
    /**
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
        ];
    }
}
