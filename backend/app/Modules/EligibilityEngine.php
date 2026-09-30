<?php

namespace App\Modules;

use App\DTOs\StatusUpdateResult;
use App\Models\Estudiante;
use App\Models\Inscripcion;
use App\Models\MateriaGrupo;
use App\Models\EstadoInscripcion;
use Throwable;

class EligibilityEngine
{
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


        $estudiante = Estudiante::where('codigo_sis', $cleanKey)
            ->orWhereHas('usuario', function ($query) use ($cleanKey) {
                $query->where('ci', $cleanKey);
            })
            ->first();


        if (!$estudiante) {

            return new StatusUpdateResult(
                isSuccessful: false,
                message: 'Estudiante no encontrado.'
            );

        }


        $materiaGrupo = MateriaGrupo::find($cleanCourseGroupId);


        if (!$materiaGrupo) {

            return new StatusUpdateResult(
                isSuccessful: false,
                message: 'Grupo de materia no encontrado.'
            );

        }


        $inscripcion = Inscripcion::where(
                'usuario_id',
                $estudiante->usuario_id
            )
            ->where(
                'materia_grupo_id',
                $materiaGrupo->id
            )
            ->first();


        if (!$inscripcion) {

            return new StatusUpdateResult(
                isSuccessful: false,
                message: 'El estudiante no está inscrito en este grupo de materia.'
            );

        }


        try {

            $estado = EstadoInscripcion::where(
                'nombre',
                $cleanStatus
            )->first();


            if (!$estado) {

                $estado = EstadoInscripcion::create([
                    'nombre' => $cleanStatus,
                    'descripcion' => $cleanStatus === 'HABILITADO'
                        ? 'Estudiante habilitado para rendir examen'
                        : 'Estudiante inhabilitado para rendir examen'
                ]);

            }
            

           $actualizado = Inscripcion::where('usuario_id', $inscripcion->usuario_id)
               ->where('materia_grupo_id', $inscripcion->materia_grupo_id)
               ->update([

                    'estado_inscripcion_id' => $estado->id,

                    'motivo_inhabilitacion' =>
                        $cleanStatus === 'INHABILITADO'
                        ? $cleanReason
                        : null,

                        'fecha_inscripcion' => now()

                    ]);


            if (!$actualizado) {

                return new StatusUpdateResult(
                    isSuccessful: false,
                    message: 'No se pudo actualizar la inscripción.'
                );

            }


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