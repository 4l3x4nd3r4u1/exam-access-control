<?php

namespace App\DTOs;

class ExamRegistrationData
{
    /**
     * @param list<ExamRoomData> $rooms
     * @param list<string> $generalRules
     * @param list<ExamStudentRuleData> $studentRules
     * @param list<int>|null $courseGroupIds
     * @param list<int>|null $auxiliarIds
     */
    public function __construct(
        public readonly int $courseGroupId,
        public readonly int $examTypeId,
        public readonly string $date,
        public readonly string $startTime,
        public readonly array $rooms,
        public readonly array $generalRules,
        public readonly array $studentRules,
        public readonly ?string $endTime = null,
        public readonly ?array $courseGroupIds = null,
        public readonly ?array $auxiliarIds = null,
    ) {}
}
