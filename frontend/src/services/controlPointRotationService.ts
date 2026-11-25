import { apiRequest } from './apiClient';

import type {
  ControlPointsResponse,
  JoinControlPointResponse,
  RotationRequestsResponse,
  RotationRequestResponse,
  RotationResponse,
  RotationHistoryResponse,
} from '../types/controlPointRotation';

function getEndpoint(examId: string | number): string {
  return `/exams/${encodeURIComponent(String(examId))}/control-points`;
}

function jsonPost(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

export const controlPointRotationService = {
  getControlPoints(
    examId: string | number,
    signal?: AbortSignal,
  ): Promise<ControlPointsResponse> {
    return apiRequest<ControlPointsResponse>(
      getEndpoint(examId),
      { signal },
    );
  },

  assignResponsibles(examId: string | number, assignments: { room_id: number; user_ids: number[] }[]): Promise<{ message: string; assigned_count: number }> {
    return apiRequest(`${getEndpoint(examId)}/assignments`, jsonPost({ assignments }));
  },

  join(
    examId: string | number,
    controlPointId: number,
  ): Promise<JoinControlPointResponse> {
    return apiRequest<JoinControlPointResponse>(
      `${getEndpoint(examId)}/join`,
      jsonPost({
        control_point_id: controlPointId,
      }),
    );
  },

  transfer(examId: string | number, controlPointId: number): Promise<JoinControlPointResponse> {
    return apiRequest<JoinControlPointResponse>(`${getEndpoint(examId)}/join`, jsonPost({ control_point_id: controlPointId, direct_transfer: true }));
  },

  getRotationRequests(
    examId: string | number,
    signal?: AbortSignal,
  ): Promise<RotationRequestsResponse> {
    return apiRequest<RotationRequestsResponse>(
      `${getEndpoint(examId)}/rotation-requests`,
      { signal },
    );
  },

  requestRotation(
    examId: string | number,
    targetPointId: number,
    receiverId: number,
  ): Promise<RotationRequestResponse> {
    return apiRequest<RotationRequestResponse>(
      `${getEndpoint(examId)}/rotation-requests`,
      jsonPost({
        target_point_id: targetPointId,
        receiver_id: receiverId,
      }),
    );
  },

  respondToRotation(
    examId: string | number,
    requestId: number,
    accepted: boolean,
  ): Promise<RotationResponse> {
    return apiRequest<RotationResponse>(
      `${getEndpoint(examId)}/rotation-requests/${requestId}/respond`,
      jsonPost({
        accepted,
      }),
    );
  },

  getHistory(
    examId: string | number,
    signal?: AbortSignal,
  ): Promise<RotationHistoryResponse> {
    return apiRequest<RotationHistoryResponse>(
      `${getEndpoint(examId)}/history`,
      { signal },
    );
  },
};