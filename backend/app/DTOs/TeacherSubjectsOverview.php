<?php

namespace App\DTOs;

class TeacherSubjectsOverview
{
    /**
     * @param array<TeacherSubjectSummary> $subjects
     */
    public function __construct(
        public readonly int $subjectsCount,
        public readonly int $studentsCount,
        public readonly ?string $academicPeriod,
        public readonly array $subjects,
    ) {}

    public function toArray(): array
    {
        return [
            'summary' => [
                'subjects_count' => $this->subjectsCount,
                'students_count' => $this->studentsCount,
                'academic_period' => $this->academicPeriod,
            ],
            'subjects' => array_map(fn(TeacherSubjectSummary $subject) => $subject->toArray(), $this->subjects),
        ];
    }
}
