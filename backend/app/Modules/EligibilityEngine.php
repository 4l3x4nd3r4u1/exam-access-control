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
        int $studentId,
        int $courseGroupId,
        string $status,
        ?string $reason = null
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

        $student = Student::find($studentId);

        if (!$student) {
            return new StatusUpdateResult(
                isSuccessful: false,
                message: 'Estudiante no encontrado.'
            );
        }

        $courseGroup = CourseGroup::find($courseGroupId);

        if (!$courseGroup) {
            return new StatusUpdateResult(
                isSuccessful: false,
                message: 'Grupo de materia no encontrado.'
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
            DB::transaction(function () use ($student, $courseGroup, $statusModel, $cleanStatus, $cleanReason) {
                StudentCourseEnrollment::where('usuario_id', $student->usuario_id)
                    ->where('materia_grupo_id', $courseGroup->id)
                    ->update([
                        'estado_inscripcion_id' => $statusModel->id,
                        'motivo_inhabilitacion' => ($cleanStatus === 'INHABILITADO') ? $cleanReason : null,
                        'updated_at' => now(),
                    ]);

                DB::table('registro_auditoria')->insert([
                    'usuario_id' => auth()->user()->id,
                    'accion' => 'CAMBIAR_ESTADO_HABILITACION',
                    'entidad_tipo' => 'inscripcion',
                    'entidad_id' => $enrollment->id,
                    'detalles' => json_encode([
                        'estudiante_id' => $student->id,
                        'course_group_id' => $courseGroup->id,
                        'estado_anterior' => $enrollment->estado_inscripcion_id,
                        'estado_nuevo' => $statusModel->id,
                        'motivo' => $cleanReason,
                    ]),
                    'fecha' => now(),
                ]);
            });

            return new StatusUpdateResult(
                isSuccessful: true,
                message: 'Estado del estudiante actualizado correctamente.'
            );
        } catch (Throwable $e) {
            Log::error('Error updating student status: ' . $e->getMessage());
            return new StatusUpdateResult(
                isSuccessful: false,
                message: 'Error al actualizar el estado. Contacte al administrador.'
            );
        }
    }
}
