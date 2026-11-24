<?php

namespace App\Http\Controllers;

use App\Models\CourseGroup;
use App\Models\EnrollmentStatus;
use App\Models\Exam;
use App\Models\ExamStudent;
use App\Models\ExamStudentStatus;
use App\Models\Room;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BlackListController extends Controller
{
    /**
     * Obtiene los estudiantes que tienen antecedentes de inhabilitación o expulsión.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
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
            'type' => ['nullable', 'in:all,expulsions'],
            'gestion' => ['nullable', 'string', 'max:50'],
            'sort' => ['nullable', 'in:recent,count'],
        ]);

        $type = $validated['type'] ?? 'all';
        $gestionFilter = trim((string) ($validated['gestion'] ?? ''));
        $sort = $validated['sort'] ?? ($type === 'expulsions' ? 'recent' : 'count');

        $inhabilitationItems = $type === 'expulsions'
            ? collect()
            : $this->buildInhabilitationEntries();

        $expulsionItems = $this->buildExpulsionEntries();

        $allEntries = $inhabilitationItems->concat($expulsionItems);

        $availableGestiones = $allEntries
            ->pluck('gestion')
            ->filter(fn($g) => is_string($g) && trim($g) !== '')
            ->unique()
            ->sort()
            ->reverse()
            ->values()
            ->all();

        if ($gestionFilter !== '') {
            $allEntries = $allEntries->filter(
                fn(array $entry) => (string) ($entry['gestion'] ?? '') === $gestionFilter
            );
        }

        $studentIds = $allEntries->pluck('user_id')->filter()->unique()->values();

        $students = Student::with('user')
            ->whereIn('usuario_id', $studentIds)
            ->get()
            ->keyBy('usuario_id');

        $groupedEntries = $allEntries->groupBy('user_id');

        $data = $students->map(function ($student, $userId) use ($groupedEntries) {
            $entries = $groupedEntries->get($userId, collect());
            $expulsionCount = $entries->where('origen', 'PUNTOS_CONTROL')->count();
            $latestDate = $entries->pluck('fecha')->filter()->sortDesc()->first();
            $gestiones = $entries
                ->pluck('gestion')
                ->filter(fn($g) => is_string($g) && trim($g) !== '')
                ->unique()
                ->values()
                ->all();

            return [
                'user_id' => (int) $userId,
                'nombre' => $student->user?->nombre,
                'codigo_sis' => $student->codigo_sis,
                'ci' => $student->user?->ci,
                'total_inhabilitaciones' => $entries->count(),
                'total_expulsiones' => $expulsionCount,
                'ultima_fecha' => $latestDate ? (string) $latestDate : null,
                'gestiones' => $gestiones,
            ];
        });

        $search = trim((string) ($validated['search'] ?? ''));

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

        $sorted = $sort === 'recent'
            ? $data->sort(function ($a, $b) {
                $dateCmp = strcmp((string) ($b['ultima_fecha'] ?? ''), (string) ($a['ultima_fecha'] ?? ''));
                if ($dateCmp !== 0) {
                    return $dateCmp;
                }
                return ($b['total_inhabilitaciones'] ?? 0) <=> ($a['total_inhabilitaciones'] ?? 0);
            })
            : $data->sort(function ($a, $b) {
                $countCmp = ($b['total_inhabilitaciones'] ?? 0) <=> ($a['total_inhabilitaciones'] ?? 0);
                if ($countCmp !== 0) {
                    return $countCmp;
                }
                return strcmp((string) ($b['ultima_fecha'] ?? ''), (string) ($a['ultima_fecha'] ?? ''));
            });

        return response()->json([
            'success' => true,
            'data' => $sorted->values(),
            'meta' => [
                'available_gestiones' => $availableGestiones,
            ],
            'message' => 'Lista negra obtenida exitosamente.',
        ], 200);
    }

    /**
     * Obtiene los antecedentes de un estudiante, incluyendo
     * inhabilitaciones y expulsiones desde Puntos de control.
     */
    public function show(Request $request, int $userId): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['nullable', 'in:all,expulsions'],
        ]);

        $type = $validated['type'] ?? 'all';

        $student = Student::with('user')
            ->where('usuario_id', $userId)
            ->first();

        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => 'Estudiante no encontrado en la lista negra.',
            ], 404);
        }

        $inhabilitations = $type === 'expulsions'
            ? collect()
            : $this->buildInhabilitationEntries($userId);

        $expulsions = $this->buildExpulsionEntries($userId);

        if ($inhabilitations->isEmpty() && $expulsions->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'El estudiante no tiene antecedentes registrados.',
            ], 404);
        }

        $antecedents = $inhabilitations
            ->concat($expulsions)
            ->map(function (array $entry) {
                unset($entry['user_id']);
                return $entry;
            })
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
                'total_expulsiones' => $expulsions->count(),
                'antecedentes' => $antecedents,
            ],
            'message' => 'Antecedentes del estudiante obtenidos exitosamente.',
        ], 200);
    }

    /**
     * Construye entradas normalizadas de inhabilitaciones académicas.
     */
    private function buildInhabilitationEntries(?int $filterUserId = null): Collection
    {
        $records = $this->getInhabilitationRecords();

        if ($filterUserId !== null) {
            $records = $records->filter(function ($record) use ($filterUserId) {
                $details = $this->decodeDetails($record->detalles);
                return (int) ($details['estudiante_id'] ?? 0) === $filterUserId;
            });
        }

        if ($records->isEmpty()) {
            return collect();
        }

        $courseGroupIds = $records->map(function ($record) {
            return $this->decodeDetails($record->detalles)['course_group_id'] ?? null;
        })->filter()->unique();

        $courseGroups = CourseGroup::with(['course', 'teacher'])
            ->whereIn('id', $courseGroupIds)
            ->get()
            ->keyBy('id');

        return $records->map(function ($record) use ($courseGroups) {
            $details = $this->decodeDetails($record->detalles);
            $courseGroup = $courseGroups->get($details['course_group_id'] ?? null);

            return [
                'user_id' => (int) ($details['estudiante_id'] ?? 0),
                'materia' => $courseGroup?->course?->sigla,
                'nombre_materia' => $courseGroup?->course?->nombre,
                'tipo_examen' => null,
                'grupo' => $courseGroup?->grupo,
                'gestion' => $courseGroup?->gestion,
                'docente' => $courseGroup?->teacher?->nombre,
                'registrado_por' => $courseGroup?->teacher?->nombre,
                'aula' => null,
                'motivo' => $details['motivo'] ?? null,
                'fecha' => (string) $record->fecha,
                'origen' => 'GESTION_HABILITACIONES',
            ];
        })->filter(fn(array $entry) => $entry['user_id'] > 0)->values();
    }

    /**
     * Construye entradas normalizadas de expulsiones desde registro_acceso_examen
     * con respaldo desde examen_estudiante para evitar omisiones o duplicados.
     */
    private function buildExpulsionEntries(?int $filterUserId = null): Collection
    {
        $accessQuery = DB::table('registro_acceso_examen')
            ->where('resultado', 'EXPULSION')
            ->orderByDesc('created_at');

        if ($filterUserId !== null) {
            $accessQuery->where('user_id_estudiante', $filterUserId);
        }

        $accessRecords = $accessQuery->get();

        $seenPairs = [];
        $rawItems = collect();

        foreach ($accessRecords as $record) {
            $pairKey = "{$record->exam_id}-{$record->user_id_estudiante}";
            if (isset($seenPairs[$pairKey])) {
                continue;
            }
            $seenPairs[$pairKey] = true;

            $fecha = ($record->fecha && $record->hora)
                ? "{$record->fecha} {$record->hora}"
                : (string) ($record->created_at ?? '');

            $rawItems->push([
                'user_id' => (int) $record->user_id_estudiante,
                'exam_id' => (int) $record->exam_id,
                'aula_id' => $record->aula_id !== null ? (int) $record->aula_id : null,
                'operator_id' => $record->user_id_operador !== null ? (int) $record->user_id_operador : null,
                'motivo' => $record->observacion,
                'fecha' => $fecha,
            ]);
        }

        $expelledStatusId = ExamStudentStatus::where('nombre', 'EXPULSADO')->value('id');
        if ($expelledStatusId !== null) {
            $fallbackQuery = ExamStudent::where('estado_id', $expelledStatusId);
            if ($filterUserId !== null) {
                $fallbackQuery->where('usuario_id', $filterUserId);
            }

            foreach ($fallbackQuery->get() as $es) {
                $pairKey = "{$es->examen_id}-{$es->usuario_id}";
                if (isset($seenPairs[$pairKey])) {
                    continue;
                }
                $seenPairs[$pairKey] = true;

                $rawItems->push([
                    'user_id' => (int) $es->usuario_id,
                    'exam_id' => (int) $es->examen_id,
                    'aula_id' => $es->aula_id !== null ? (int) $es->aula_id : null,
                    'operator_id' => null,
                    'motivo' => $es->motivo_expulsion,
                    'fecha' => (string) ($es->updated_at ?? $es->created_at ?? ''),
                ]);
            }
        }

        if ($rawItems->isEmpty()) {
            return collect();
        }

        $examIds = $rawItems->pluck('exam_id')->unique()->values();
        $exams = Exam::with([
            'courseGroup.course',
            'courseGroup.teacher',
            'examType',
        ])
            ->whereIn('id', $examIds)
            ->get()
            ->keyBy('id');

        $roomIds = $rawItems->pluck('aula_id')->filter()->unique()->values();
        $rooms = $roomIds->isNotEmpty()
            ? Room::whereIn('id', $roomIds)->pluck('nombre', 'id')
            : collect();

        $operatorIds = $rawItems->pluck('operator_id')->filter()->unique()->values();
        $operators = $operatorIds->isNotEmpty()
            ? User::whereIn('id', $operatorIds)->pluck('nombre', 'id')
            : collect();

        return $rawItems->map(function (array $item) use ($exams, $rooms, $operators) {
            $exam = $exams->get($item['exam_id']);
            $courseGroup = $exam?->courseGroup;
            $roomName = $item['aula_id'] !== null ? $rooms->get($item['aula_id']) : null;
            $operatorName = $item['operator_id'] !== null ? $operators->get($item['operator_id']) : null;

            return [
                'user_id' => $item['user_id'],
                'materia' => $courseGroup?->course?->sigla,
                'nombre_materia' => $courseGroup?->course?->nombre,
                'tipo_examen' => $exam?->examType?->nombre,
                'grupo' => $courseGroup?->grupo,
                'gestion' => $courseGroup?->gestion,
                'docente' => $courseGroup?->teacher?->nombre,
                'registrado_por' => $operatorName ?? $courseGroup?->teacher?->nombre,
                'aula' => $roomName,
                'motivo' => $item['motivo'],
                'fecha' => $item['fecha'],
                'origen' => 'PUNTOS_CONTROL',
            ];
        })->values();
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
}