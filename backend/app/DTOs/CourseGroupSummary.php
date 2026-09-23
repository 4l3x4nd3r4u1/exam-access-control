<?php

namespace App\DTOs;

class CourseGroupSummary
{
    public function __construct(
        public readonly string $courseGroupId,
        public readonly string $subjectCode,
        public readonly string $subjectName,
        public readonly string $groupCode,
        public readonly string $academicTerm,
        public readonly int $totalEnrolled,
        public readonly int $teacherId,
    ) {}

    public function toArray(): array
    {
        return [
            'course_group_id' => $this->courseGroupId,
            'subject_code' => $this->subjectCode,
            'subject_name' => $this->subjectName,
            'group_code' => $this->groupCode,
            'academic_term' => $this->academicTerm,
            'total_enrolled' => $this->totalEnrolled,
            'teacher_id' => $this->teacherId,
        ];
    }
}
