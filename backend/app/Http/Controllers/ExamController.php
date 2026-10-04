<?php

namespace App\Http\Controllers;

use App\DTOs\ExamRegistrationData;
use App\DTOs\ExamRoomData;
use App\DTOs\ExamStudentRuleData;
use App\DTOs\ExamSummary;
use App\DTOs\RoomSummary;
use App\DTOs\ScheduleExamData;
use App\Http\Requests\AvailableRoomsRequest;
use App\Http\Requests\ScheduleExamRequest;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;
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
            'message' => 'Exámenes del curso obtenidos exitosamente.',
        ], 200);
    }

    /**
     * Endpoint to register a new exam.
     */
    public function store(ScheduleExamRequest $request, int $courseGroupId): JsonResponse
    {
        $scheduleData = $request->toDTO();

        // Convert ScheduleExamData to ExamRegistrationData
        // We need to map exam type title to examTypeId, classroom names to room IDs
        $examType = \App\Models\ExamType::where('nombre', $scheduleData->title)->firstOrFail();
        
        $rooms = [];
        foreach ($scheduleData->classrooms as $classroomName) {
            $room = \App\Models\Room::where('nombre', $classroomName)->firstOrFail();
            $rooms[] = new ExamRoomData(
                roomId: $room->id,
                students: [],
                auxiliarId: null,
            );
        }

        $data = new ExamRegistrationData(
            courseGroupId: $courseGroupId,
            examTypeId: $examType->id,
            date: $scheduleData->date,
            startTime: $scheduleData->startTime,
            rooms: $rooms,
            generalRules: $scheduleData->rules,
            studentRules: [],
        );

        $result = $this->storage->registerExam($data, $request->user()?->id ?? (\PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth::setToken($request->bearerToken())->authenticate()?->id));

        return response()->json([
            'success' => $result->isSuccessful,
            'message' => $result->message,
            'timestamp' => $result->timestamp,
        ], $result->isSuccessful ? 201 : 400);
    }
}