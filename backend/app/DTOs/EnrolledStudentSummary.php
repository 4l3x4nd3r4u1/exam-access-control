<?php

namespace App\DTOs;

class EnrolledStudentSummary
{
    /**
     * @param string $studentKey Institutional SIS Code
     * @param string $ci Identity Card number
     * @param string $fullName Student's full name
     * @param string $status Academic eligibility status ('HABILITADO' | 'INHABILITADO')
     * @param string|null $ineligibilityReason Justification motive if inhabilitado
     */
    public function __construct(
        public readonly string $studentKey,
        public readonly string $ci,
        public readonly string $fullName,
        public readonly string $status,
        public readonly ?string $ineligibilityReason = null
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'studentKey' => $this->studentKey,
            'ci' => $this->ci,
            'fullName' => $this->fullName,
            'status' => $this->status,
            'ineligibilityReason' => $this->ineligibilityReason,
        ];
    }
}
