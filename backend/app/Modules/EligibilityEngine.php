<?php

namespace App\Modules;

use App\DTOs\StatusUpdateResult;
use App\Models\CourseGroup;
use App\Models\EnrollmentStatus;
use App\Models\Student;
use App\Models\StudentCourseEnrollment;
use Throwable;

class EligibilityEngine
{
    /**
     * Updates the academic eligibility status of a student for a specific course group.
     *
     * @param string $key Student SIS code or CI
     * @param string $courseGroupId Canonical course group identifier or numeric ID
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

        $student = Student::where('codigo_sis', is_numeric($cleanKey) ? (int)$cleanKey : 0)
            ->orWhereHas('user', fn($q) => $q->where('ci', $cleanKey))
            ->first();

        if (!$student) {
            return new StatusUpdateResult(
                isSuccessful: false,
                message: 'Estudiante no encontrado.'
            );
        }

        // Find course group by numeric ID or composite string
        $courseGroup = null;
        if (is_numeric($cleanCourseGroupId)) {
            $courseGroup = CourseGroup::find((int) $cleanCourseGroupId);
        } elseif (preg_match('/^([A-Z0-9]+)-G?([A-Z0-9]+)-(.*)$/i', $cleanCourseGroupId, $m)) {
            $courseGroup = CourseGroup::whereHas('course', fn($q) => $q->where('sigla', strtoupper($m[1])))
                ->where('grupo', strtoupper($m[2]))
                ->where('gestion', $m[3])
                ->first();
        }

        if (!$courseGroup) {
            return new StatusUpdateResult(
                isSuccessful: false,
                message: 'El estudiante no está inscrito en este grupo de materia.'
            );
        }

        $enrollment = StudentCourseEnrollment::where('usuario_id', $student->usuario_id)
            ->where('materia_grupo_id', $courseGroup->id)
            ->first();

        if (!$enrollment) {
            return new StatusUpdateResult(
                isSuccessful: false,
                message: 'El estudiante no está inscrito en este grupo de materia.'
            );
        }

        $statusModel = EnrollmentStatus::where('nombre', $cleanStatus)->first();
        if (!$statusModel) {
            return new StatusUpdateResult(
                isSuccessful: false,
                message: "Estado '{$cleanStatus}' no encontrado en el catálogo."
            );
        }

        try {
            StudentCourseEnrollment::where('usuario_id', $student->usuario_id)
                ->where('materia_grupo_id', $courseGroup->id)
                ->update([
                    'estado_inscripcion_id' => $statusModel->id,
                    'motivo_inhabilitacion' => ($cleanStatus === 'INHABILITADO') ? $cleanReason : null,
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
