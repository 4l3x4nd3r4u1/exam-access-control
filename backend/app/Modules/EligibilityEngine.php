<?php

namespace App\Modules;

use App\DTOs\StatusUpdateResult;
use App\Models\CourseGroup;
use App\Models\EnrollmentStatus;
use App\Models\Student;
use App\Models\StudentCourseEnrollment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class EligibilityEngine
{
    /**
     * Updates the academic eligibility status of a student for a specific course group.
     *
     * @param int $studentId
     * @param int $courseGroupId
     * @param string $status 'HABILITADO' | 'INHABILITADO'
     * @param string|null $reason Mandatory when status is 'INHABILITADO'
     * @return StatusUpdateResult
     */
    public function updateStudentStatus(
        int $userId,
        int $courseGroupId,
        string $status,
        ?string $reason = null,
        ?int $auditUserId = null
    ): StatusUpdateResult {
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

        $courseGroup = CourseGroup::find($courseGroupId);

        if (!$courseGroup) {
            return new StatusUpdateResult(
                isSuccessful: false,
                message: 'Grupo de materia no encontrado.'
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
            $updated = DB::transaction(function () use ($userId,$courseGroup,$statusModel,$cleanStatus,$cleanReason,$auditUserId
    ) {
        $enrollment = StudentCourseEnrollment::where('usuario_id', $userId)
            ->where('materia_grupo_id', $courseGroup->id)
            ->lockForUpdate()
            ->first();

        if (!$enrollment) {
            throw new \RuntimeException(
                'El estudiante no está inscrito en este grupo de materia.'
            );
        }

        $previousStatusId = (int) $enrollment->estado_inscripcion_id;
        $newStatusId = (int) $statusModel->id;

        // Evitar registrar nuevamente un estado que no ha cambiado.
        if ($previousStatusId === $newStatusId) {
            return false;
        }

        StudentCourseEnrollment::where('usuario_id', $userId)
            ->where('materia_grupo_id', $courseGroup->id)
            ->update([
                'estado_inscripcion_id' => $newStatusId,
                'motivo_inhabilitacion' => $cleanStatus === 'INHABILITADO'
                    ? $cleanReason
                    : null,
                'updated_at' => now(),
            ]);

        // Registrar permanentemente el cambio de estado.
        DB::table('registro_auditoria')->insert([
            'usuario_id' => $auditUserId,
            'accion' => 'CAMBIAR_ESTADO_HABILITACION',
            'entidad_tipo' => 'inscripcion',
            'entidad_id' => null,
            'detalles' => json_encode([
                'estudiante_id' => $userId,
                'course_group_id' => $courseGroup->id,
                'estado_anterior' => $previousStatusId,
                'estado_nuevo' => $newStatusId,
                'estado_nuevo_nombre' => $cleanStatus,
                'motivo' => $cleanStatus === 'INHABILITADO'
                    ? $cleanReason
                    : null,
            ], JSON_UNESCAPED_UNICODE),
            'fecha' => now(),
        ]);

        return true;
    });

    return new StatusUpdateResult(
        isSuccessful: true,
        message: $updated
            ? 'Estado del estudiante actualizado correctamente.'
            : 'El estudiante ya tiene el estado solicitado.'
    );

} catch (Throwable $e) {
    Log::error('Error updating student status: ' . $e->getMessage());

    $message = $e instanceof \RuntimeException
        ? $e->getMessage()
        : 'Error al actualizar el estado. Contacte al administrador.';

    return new StatusUpdateResult(
        isSuccessful: false,
        message: $message
    );
}
    }
}
