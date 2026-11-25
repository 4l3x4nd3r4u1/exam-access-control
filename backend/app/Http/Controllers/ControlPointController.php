<?php

namespace App\Http\Controllers;

use App\Services\ControlPointService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ControlPointController extends Controller
{
    public function __construct(
        private readonly ControlPointService $service
    ) {}

    public function index(int $examId): JsonResponse
    {
        return response()->json(
            $this->service->getControlPoints(
                $examId,
                (int) auth()->id()
            )
        );
    }

    public function assignResponsibles(Request $request, int $examId): JsonResponse
    {
        $validated = $request->validate([
            'assignments' => ['required', 'array', 'min:1'],
            'assignments.*.room_id' => ['required', 'integer', 'min:1', 'distinct'],
            'assignments.*.user_ids' => ['required', 'array', 'min:1'],
            'assignments.*.user_ids.*' => ['required', 'integer', 'min:1'],
        ]);
        return response()->json($this->service->assignResponsibles($examId, (int) auth()->id(), $validated['assignments']));
    }

    public function join(
        Request $request,
        int $examId
    ): JsonResponse {
        $validated = $request->validate([
            'control_point_id' => ['required', 'integer', 'min:1'],
            'direct_transfer' => ['sometimes', 'boolean'],
        ]);

        return response()->json(
            $this->service->join(
                $examId,
                (int) $validated['control_point_id'],
                (int) auth()->id(),
                (bool) ($validated['direct_transfer'] ?? false)
            )
        );
    }

    public function requestRotation(
        Request $request,
        int $examId
    ): JsonResponse {
        $validated = $request->validate([
            'target_point_id' => ['required', 'integer', 'min:1'],
            'receiver_id' => ['required', 'integer', 'min:1'],
        ]);

        return response()->json(
            $this->service->requestRotation(
                $examId,
                (int) $validated['target_point_id'],
                (int) $validated['receiver_id'],
                (int) auth()->id()
            ),
            201
        );
    }

    public function respondToRotation(
        Request $request,
        int $examId,
        int $requestId
    ): JsonResponse {
        $validated = $request->validate([
            'accepted' => ['required', 'boolean'],
        ]);

        return response()->json(
            $this->service->respondToRotation(
                $examId,
                $requestId,
                (int) auth()->id(),
                (bool) $validated['accepted']
            )
        );
    }

    public function rotationRequests(int $examId): JsonResponse
    {
        return response()->json([
            'requests' => $this->service->getRotationRequests(
                $examId,
                (int) auth()->id()
            ),
        ]);
    }

    public function history(int $examId): JsonResponse
    {
        return response()->json([
            'history' => $this->service->getHistory(
                $examId,
                (int) auth()->id()
            ),
        ]);
    }
}