<?php

namespace App\DTOs;

class TeacherSubjectDetail
{
    /**
     * @param array<TeacherSubjectStudent> $students
     */
    public function __construct(
        public readonly TeacherSubjectSummary $subject,
        public readonly array $students,
    ) {}

    public function toArray(): array
    {
        return [
            'subject' => $this->subject->toArray(),
            'students' => array_map(fn(TeacherSubjectStudent $student) => $student->toArray(), $this->students),
        ];
    }
}
