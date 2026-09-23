<?php

namespace App\Modules;

use App\DTOs\StatusUpdateResult;
use App\Models\Student;
use App\Models\StudentCourseEnrollment;
use Throwable;

class EligibilityEngine
{
    /**
     * Updates the academic eligibility status of a student for a specific course group.
     *
     * @param string $key Student SIS code or CI
     * @param string $courseGroupId Canonical course group identifier
     * @param string $status Academic status ('HABILITADO' | 'INHABILITADO')
     * @param string|null $reason Justification reason (mandatory when status is 'INHABILITADO')
     * @return StatusUpdateResult
     */
    public function updateStudentStatus(
        string $key,
        string $courseGroupId,
        string $status,
        ?string $reason = null
    ): StatusUpdateResult {
        $cleanKey = trim($key);
        $cleanCourseGroupId = trim($courseGroupId);
        $cleanStatus = strtoupper(trim($status));
        $cleanReason = $reason !== null ? trim($reason) : null;

        if (!in_array($cleanStatus, ['HABILITADO', 'INHABILITADO'], true)) {
            return new StatusUpdateResult(
                isSuccessful: false,
                message: 'Estado no válido. Debe ser HABILITADO o INHABILITADO.'
            );
        }

        if ($cleanStatus === 'INHABILITADO' && empty($cleanReason)) {
            return new StatusUpdateResult(
                isSuccessful: false,
                message: 'El motivo de inhabilitación es obligatorio.'
            );
        }

        $student = Student::where('student_key', $cleanKey)
            ->orWhere('ci', $cleanKey)
            ->first();

        if (!$student) {
            return new StatusUpdateResult(
                isSuccessful: false,
                message: 'Estudiante no encontrado.'
            );
        }

        $enrollment = StudentCourseEnrollment::where('student_key', $student->student_key)
            ->where('course_group_id', $cleanCourseGroupId)
            ->first();

        if (!$enrollment) {
            return new StatusUpdateResult(
                isSuccessful: false,
                message: 'El estudiante no está inscrito en este grupo de materia.'
            );
        }

        try {
            StudentCourseEnrollment::where('student_key', $student->student_key)
                ->where('course_group_id', $cleanCourseGroupId)
                ->update([
                    'status' => $cleanStatus,
                    'ineligibility_reason' => ($cleanStatus === 'INHABILITADO') ? $cleanReason : null,
                    'updated_at' => now(),
                ]);

            return new StatusUpdateResult(
                isSuccessful: true,
                message: 'Estado del estudiante actualizado correctamente.'
            );
        } catch (Throwable $e) {
            return new StatusUpdateResult(
                isSuccessful: false,
                message: 'Error al actualizar el estado: ' . $e->getMessage()
            );
        }
    }
}
