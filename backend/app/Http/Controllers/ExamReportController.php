<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExamReportController extends Controller
{
    /**
     * Registra un reporte de incidencia durante un examen.
     */
    public function store(Request $request, int $examId): JsonResponse
    {
        $validated = $request->validate([
            'descripcion' => ['required', 'string', 'max:5000'],
        ], [
            'descripcion.required' => 'La descripción del reporte es obligatoria.',
            'descripcion.max' => 'La descripción no puede superar los 5000 caracteres.',
        ]);

        $exam = Exam::with('courseGroup')->find($examId);

        if (!$exam) {
            return response()->json([
                'success' => false,
                'message' => 'El examen no existe.',
            ], 404);
        }

        if (!$this->userCanAccessExam($exam)) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene autorización para generar reportes de este examen.',
            ], 403);
        }

        if (!$this->canGenerateReport($exam)) {
            return response()->json([
                'success' => false,
                'message' => 'El plazo para generar reportes de este examen ha finalizado o todavía no ha comenzado.',
            ], 422);
        }

        $reportId = DB::table('registro_auditoria')->insertGetId([
            'usuario_id' => auth()->id(),
            'accion' => 'GENERAR_REPORTE_EXAMEN',
            'entidad_tipo' => 'examen',
            'entidad_id' => $exam->id,
            'detalles' => json_encode([
                'descripcion' => trim($validated['descripcion']),
            ], JSON_UNESCAPED_UNICODE),
            'fecha' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $reportId,
                'examen_id' => $exam->id,
                'descripcion' => trim($validated['descripcion']),
            ],
            'message' => 'Reporte registrado correctamente.',
        ], 201);
    }

    /**
     * Consulta los reportes registrados para un examen.
     */
    public function index(int $examId): JsonResponse
    {
        $exam = Exam::find($examId);

        if (!$exam) {
            return response()->json([
                'success' => false,
                'message' => 'El examen no existe.',
            ], 404);
        }

        if (!$this->userCanAccessExam($exam)) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene autorización para consultar los reportes de este examen.',
            ], 403);
        }

        $reports = DB::table('registro_auditoria')
            ->where('accion', 'GENERAR_REPORTE_EXAMEN')
            ->where('entidad_tipo', 'examen')
            ->where('entidad_id', $examId)
            ->orderByDesc('fecha')
            ->get()
            ->map(function ($report) {
                $details = json_decode($report->detalles ?? '{}', true) ?: [];

                return [
                    'id' => $report->id,
                    'usuario_id' => $report->usuario_id,
                    'descripcion' => $details['descripcion'] ?? '',
                    'fecha' => $report->fecha,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $reports,
            'message' => 'Reportes del examen obtenidos correctamente.',
        ], 200);
    }

    /**
     * Genera el PDF de un reporte registrado.
     */
    public function download(int $examId, int $reportId)
    {
        $exam = Exam::with(['courseGroup.course', 'courseGroup.teacher'])
            ->find($examId);

        if (!$exam) {
            return response()->json([
                'success' => false,
                'message' => 'El examen no existe.',
            ], 404);
        }

        if (!$this->userCanAccessExam($exam)) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene autorización para consultar este reporte.',
            ], 403);
        }

        $report = DB::table('registro_auditoria')
            ->where('id', $reportId)
            ->where('accion', 'GENERAR_REPORTE_EXAMEN')
            ->where('entidad_tipo', 'examen')
            ->where('entidad_id', $examId)
            ->first();

        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'El reporte no existe.',
            ], 404);
        }

        $details = json_decode($report->detalles ?? '{}', true) ?: [];

        $reportUser = DB::table('usuario')
            ->where('id', $report->usuario_id)
            ->value('nombre');

        $pdf = Pdf::loadView('reports.exam-report', [
            'exam' => $exam,
            'report' => $report,
            'description' => $details['descripcion'] ?? '',
            'reportUser' => $reportUser,
        ]);

        return $pdf->download('reporte-examen-' . $examId . '-' . $reportId . '.pdf');
    }


/**
 * Comprueba si el usuario tiene autorización para gestionar puntos de control.
 */
    /**
 * Comprueba si el usuario autenticado tiene autorización
 * para acceder a los reportes de un examen específico.
 *
 * El usuario debe contar con el permiso general y estar
 * asignado como docente responsable o auxiliar del examen.
 */
    private function userCanAccessExam(Exam $exam): bool
    {
        $user = auth()->user();

        if (!$user || !$user->hasFunction('GESTIONAR_PUNTOS_CONTROL_EXAMEN')) {
            return false;
        }

        $userId = (int) $user->id;

        return Exam::query()
            ->whereKey($exam->id)
            ->where(function ($query) use ($userId) {
                $query
                    ->whereHas('courseGroup', function ($courseQuery) use ($userId) {
                        $courseQuery->where('docente_id', $userId);
                    })
                    ->orWhereHas('examRooms', function ($roomQuery) use ($userId) {
                        $roomQuery->where('auxiliar_id', $userId);
                    });
            })
            ->exists();
    }


    /**
     * Comprueba el horario permitido para generar reportes.
     */
    private function canGenerateReport(Exam $exam): bool
    {
        $timezone = 'America/La_Paz';

        $examDate = $exam->fecha->format('Y-m-d');

        $start = CarbonImmutable::parse(
            $examDate . ' ' . $exam->hora_inicio,
            $timezone
        );

        $end = CarbonImmutable::parse(
            $examDate . ' ' . $exam->hora_fin,
            $timezone
        );

        $now = CarbonImmutable::now($timezone);

        return $now->greaterThanOrEqualTo($start)
            && $now->lessThanOrEqualTo($end->addHours(2));
    }
}
