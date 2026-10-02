<?php

namespace App\DTOs;

class ExamRegistrationData
{
    /**
     * @param list<ExamRoomData> $rooms
     * @param list<string> $generalRules
     * @param list<ExamStudentRuleData> $studentRules
     */
    public function __construct(
        public readonly int $courseGroupId,
        public readonly int $examTypeId,
        public readonly string $date,
        public readonly string $startTime,
        public readonly array $rooms,
        public readonly array $generalRules,
        public readonly array $studentRules,
    ) {}
}
