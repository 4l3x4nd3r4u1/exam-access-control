<?php

namespace App\Http\Controllers;

<<<<<<< HEAD
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
=======
use App\DTOs\ExamSummary;
use App\Http\Requests\ScheduleExamRequest;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;
>>>>>>> 00cff998e2fa626b462a6d86ccd700a8235ca16f

class ExamController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    /**
<<<<<<< HEAD
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
=======
     * Retrieves the list of scheduled exams for a course group.
     */
    public function index(string $courseGroupId): JsonResponse
    {
        $exams = $this->storage->getCourseExams($courseGroupId);
>>>>>>> 00cff998e2fa626b462a6d86ccd700a8235ca16f

        return response()->json([
            'success' => true,
            'data' => array_map(fn(ExamSummary $exam) => $exam->toArray(), $exams),
<<<<<<< HEAD
            'message' => 'Exámenes obtenidos exitosamente.',
=======
            'message' => 'Exámenes del curso obtenidos exitosamente.',
>>>>>>> 00cff998e2fa626b462a6d86ccd700a8235ca16f
        ], 200);
    }

    /**
<<<<<<< HEAD
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
=======
     * Schedules a new exam for a course group.
     */
    public function store(ScheduleExamRequest $request, string $courseGroupId): JsonResponse
    {
        $data = $request->toDTO();
        $result = $this->storage->scheduleExam($courseGroupId, $data);
>>>>>>> 00cff998e2fa626b462a6d86ccd700a8235ca16f

        return response()->json([
            'success' => $result->isSuccessful,
            'message' => $result->message,
            'timestamp' => $result->timestamp,
        ], $result->isSuccessful ? 201 : 400);
    }
}
