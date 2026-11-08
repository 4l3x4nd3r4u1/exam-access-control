<?php

namespace App\Http\Controllers;

use App\Models\CourseGroup;
use App\Models\EnrollmentStatus;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Exam;

class BlackListController extends Controller
{
    /**
     * Obtiene los estudiantes que tienen antecedentes de inhabilitación.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search' => [
                'nullable',
                'string',
                'max:150',
                function ($attribute, $value, $fail) {
                    if (!preg_match('/^[\pL\s]+$/u', $value) && !preg_match('/^\d+$/', $value)) {
                        $fail('La búsqueda solo permite nombres o números de SIS y CI.');
                    }
                },
            ],
        ]);

        $records = $this->getInhabilitationRecords();
        $expulsions = $this->getExpulsionRecords();

        $studentIds = $records->map(function ($record) {
            return $this->decodeDetails($record->detalles)['estudiante_id'] ?? null;
        })
            ->concat($expulsions->pluck('user_id_estudiante'))
            ->filter()
            ->unique()
            ->values();

        $students = Student::with('user')
            ->whereIn('usuario_id', $studentIds)
            ->get()
            ->keyBy('usuario_id');

        $groupedRecords = $records->groupBy(function ($record) {
            return $this->decodeDetails($record->detalles)['estudiante_id'] ?? null;
        });

        $groupedExpulsions = $expulsions->groupBy('user_id_estudiante');

        $data = $students->map(function ($student, $userId) use ($groupedRecords, $groupedExpulsions) {
            return [
                'user_id' => $userId,
                'nombre' => $student->user?->nombre,
                'codigo_sis' => $student->codigo_sis,
                'ci' => $student->user?->ci,
                'total_inhabilitaciones' =>
                    $groupedRecords->get($userId, collect())->count()
                    + $groupedExpulsions->get($userId, collect())->count(),
            ];
        });
        $data = $data
        ->sortByDesc('total_inhabilitaciones')
        ->values();
        $search = trim((string) $request->query('search'));

        if ($search !== '') {
            $numericSearch = ctype_digit($search);

            $data = $data->filter(function ($student) use ($search, $numericSearch) {
                if ($numericSearch) {
                    return str_contains((string) $student['codigo_sis'], $search)
                        || str_contains((string) $student['ci'], $search);
                }

                return str_contains(
                    Str::lower(Str::ascii($student['nombre'] ?? '')),
                    Str::lower(Str::ascii($search))
                );
            });
        }

        return response()->json([
            'success' => true,
            'data' => $data->values(),
            'message' => 'Lista negra obtenida exitosamente.',
        ], 200);
    }

        /**
     * Obtiene los antecedentes de un estudiante, incluyendo
     * inhabilitaciones y expulsiones desde Puntos de control.
     */
    public function show(int $userId): JsonResponse
    {
        $student = Student::with('user')
            ->where('usuario_id', $userId)
            ->first();

        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => 'Estudiante no encontrado en la lista negra.',
            ], 404);
        }

        $records = $this->getInhabilitationRecords()
            ->filter(function ($record) use ($userId) {
                $details = $this->decodeDetails($record->detalles);

                return (int) ($details['estudiante_id'] ?? 0) === $userId;
            });

        $expulsions = $this->getExpulsionRecords()
            ->filter(function ($record) use ($userId) {
                return (int) $record->user_id_estudiante === $userId;
            });

        if ($records->isEmpty() && $expulsions->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'El estudiante no tiene antecedentes registrados.',
            ], 404);
        }

        $courseGroupIds = $records->map(function ($record) {
            return $this->decodeDetails($record->detalles)['course_group_id'] ?? null;
        })->filter()->unique();

        $courseGroups = CourseGroup::with(['course', 'teacher'])
            ->whereIn('id', $courseGroupIds)
            ->get()
            ->keyBy('id');

        $antecedents = $records->map(function ($record) use ($courseGroups) {
            $details = $this->decodeDetails($record->detalles);
            $courseGroup = $courseGroups->get($details['course_group_id'] ?? null);

            return [
                'materia' => $courseGroup?->course?->sigla,
                'nombre_materia' => $courseGroup?->course?->nombre,
                'grupo' => $courseGroup?->grupo,
                'gestion' => $courseGroup?->gestion,
                'docente' => $courseGroup?->teacher?->nombre,
                'motivo' => $details['motivo'] ?? null,
                'fecha' => $record->fecha,
                'origen' => 'GESTION_HABILITACIONES',
            ];
        });

        $examIds = $expulsions->pluck('exam_id')->unique();

        $exams = Exam::with([
            'courseGroup.course',
            'courseGroup.teacher',
        ])
            ->whereIn('id', $examIds)
            ->get()
            ->keyBy('id');

        $expulsionAntecedents = $expulsions->map(function ($record) use ($exams) {
            $exam = $exams->get($record->exam_id);
            $courseGroup = $exam?->courseGroup;

            return [
                'materia' => $courseGroup?->course?->sigla,
                'nombre_materia' => $courseGroup?->course?->nombre,
                'grupo' => $courseGroup?->grupo,
                'gestion' => $courseGroup?->gestion,
                'docente' => $courseGroup?->teacher?->nombre,
                'motivo' => $record->observacion,
                'fecha' => $record->created_at,
                'origen' => 'PUNTOS_CONTROL',
            ];
        });

        $antecedents = $antecedents
            ->concat($expulsionAntecedents)
            ->sortByDesc('fecha')
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'user_id' => $student->usuario_id,
                'nombre' => $student->user?->nombre,
                'codigo_sis' => $student->codigo_sis,
                'ci' => $student->user?->ci,
                'total_inhabilitaciones' => $antecedents->count(),
                'antecedentes' => $antecedents,
            ],
            'message' => 'Antecedentes del estudiante obtenidos exitosamente.',
        ], 200);
    }

    /**
     * Recupera los registros históricos de inhabilitación.
     */
    private function getInhabilitationRecords()
    {
        $statusId = EnrollmentStatus::where('nombre', 'INHABILITADO')->value('id');

        if (!$statusId) {
            return collect();
        }

        return DB::table('registro_auditoria')
            ->where('accion', 'CAMBIAR_ESTADO_HABILITACION')
            ->where(function ($query) use ($statusId) {
                $query->where('detalles->estado_nuevo_nombre', 'INHABILITADO')
                    ->orWhere('detalles->estado_nuevo', $statusId);
            })
            ->orderByDesc('fecha')
            ->get();
    }

    /**
     * Convierte los detalles JSON de auditoría en un arreglo.
     */
    private function decodeDetails($details): array
    {
        if (is_array($details)) {
            return $details;
        }

        return json_decode($details ?? '{}', true) ?: [];
    }

        /**
     * Obtiene las expulsiones registradas desde Puntos de control.
     *
     * Cada registro corresponde a una expulsión de un estudiante
     * durante un examen y se considera un antecedente para Lista Negra.
     */
    private function getExpulsionRecords()
    {
        return DB::table('registro_acceso_examen')
            ->where('resultado', 'EXPULSION')
            ->orderByDesc('created_at')
            ->get();
    }
}