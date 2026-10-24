<?php

namespace App\DTOs;

class ExpulsionHistoryItem
{
    public function __construct(
        public readonly string $examId,
        public readonly string $subjectName,
        public readonly string $group,
        public readonly string $academicTerm,
        public readonly string $examType,
        public readonly ?string $date,
        public readonly ?string $roomName,
        public readonly ?string $reason,
    ) {}

    public function toArray(): array
    {
        return [
            'exam_id' => $this->examId,
            'subject_name' => $this->subjectName,
            'group' => $this->group,
            'academic_term' => $this->academicTerm,
            'exam_type' => $this->examType,
            'date' => $this->date,
            'room_name' => $this->roomName,
            'reason' => $this->reason,
        ];
    }
}
