<?php

namespace App\DTOs;

class ProcessedRosterSummary
{
    public function __construct(
        public readonly string $courseGroupId,
        public readonly string $subjectCode,
        public readonly string $subjectName,
        public readonly string $groupCode,
        public readonly string $academicTerm,
        public readonly ?string $teacherName = null,
    ) {}

    public function toArray(): array
    {
        return [
            'course_group_id' => $this->courseGroupId,
            'subject_code' => $this->subjectCode,
            'subject_name' => $this->subjectName,
            'group_code' => $this->groupCode,
            'academic_term' => $this->academicTerm,
            'teacher_name' => $this->teacherName,
        ];
    }
}
