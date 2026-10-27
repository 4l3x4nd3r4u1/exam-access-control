<?php

namespace App\DTOs;

class AllExamSummary
{
    /**
     * @param list<AllExamRoomSummary> $rooms
     * @param list<string> $generalRules
     */
    public function __construct(
        public readonly string $examId,
        public readonly string $courseGroupId,
        public readonly string $subjectName,
        public readonly string $group,
        public readonly string $examType,
        public readonly string $date,
        public readonly string $startTime,
        public readonly string $endTime,
        public readonly array $rooms,
        public readonly array $generalRules = [],
    ) {}

    public function toArray(): array
    {
        return [
            'exam_id' => $this->examId,
            'course_group_id' => $this->courseGroupId,
            'subject_name' => $this->subjectName,
            'group' => $this->group,
            'exam_type' => $this->examType,
            'date' => $this->date,
            'start_time' => $this->startTime,
            'end_time' => $this->endTime,
            'rooms' => array_map(
                fn(AllExamRoomSummary $room) => $room->toArray(),
                $this->rooms
            ),
            'general_rules' => $this->generalRules,
        ];
    }
}
