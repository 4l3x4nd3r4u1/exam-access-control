<?php

namespace App\Http\Controllers;

use App\DTOs\ExamRegistrationData;
use App\DTOs\ExamRoomData;
use App\DTOs\ExamStudentRuleData;
use App\DTOs\ExamSummary;
use App\DTOs\RoomSummary;
use App\Http\Requests\AvailableRoomsRequest;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class ExamController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    /**
     * Endpoint to get available rooms for a specific date and time.
     */
    public function availableRooms(AvailableRoomsRequest $request): JsonResponse
    {
        try {
            $date = $request->query('date');
            $startTime = $request->query('startTime');
            $rooms = $this->storage->getAvailableRooms($date, $startTime);

            return response()->json([
                'success' => true,
                'data' => array_map(fn(RoomSummary $room) => $room->toArray(), $rooms),
                'message' => 'Aulas disponibles obtenidas exitosamente.',
            ], 200);
        } catch (Throwable $e) {
            Log::error('Error getting available rooms: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las aulas disponibles.',
            ], 500);
        }
    }

    /**
     * Endpoint to list all exams for a specific course group.
     */
    public function index(int $courseGroupId): JsonResponse
    {
        $exams = $this->storage->getExamsByCourseGroup($courseGroupId);

        return response()->json([
            'success' => true,
            'data' => array_map(fn(ExamSummary $exam) => $exam->toArray(), $exams),
            'message' => 'Exámenes obtenidos exitosamente.',
        ], 200);
    }

    /**
     * Endpoint to register a new exam.
     */
    public function store(Request $request, int $courseGroupId): JsonResponse
    {
        $data = new ExamRegistrationData(
            courseGroupId: $courseGroupId,
            examTypeId: (int) $request->input('examTypeId'),
            date: $request->input('date'),
            startTime: $request->input('startTime'),
            rooms: array_map(fn($r) => new ExamRoomData(
                roomId: (int) $r['roomId'],
                students: array_map('intval', $r['students'] ?? []),
                auxiliarId: isset($r['auxiliarId']) ? (int) $r['auxiliarId'] : null,
            ), $request->input('rooms', [])),
            generalRules: $request->input('generalRules', []),
            studentRules: array_map(fn($r) => new ExamStudentRuleData(
                studentId: (int) $r['studentId'],
                rule: $r['rule'],
            ), $request->input('studentRules', [])),
        );

        $result = $this->storage->registerExam($data, $request->user()?->id ?? (\PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth::setToken($request->bearerToken())->authenticate()?->id));

        return response()->json([
            'success' => $result->isSuccessful,
            'message' => $result->message,
            'timestamp' => $result->timestamp,
        ], $result->isSuccessful ? 201 : 400);
    }
}
