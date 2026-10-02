<?php

namespace App\DTOs;

class ExamStudentRuleData
{
    public function __construct(
        public readonly int $studentId,
        public readonly string $rule,
    ) {}
}
