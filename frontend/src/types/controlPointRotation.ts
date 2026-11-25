export type ControlType = 'ENTRY' | 'DURING_EXAM';

export type RotationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED';

export type RotationDirection =
  | 'INCOMING'
  | 'OUTGOING';

export interface ControlPointResponsible {
  user_id: number;
  name: string | null;
  started_at: string;
}

export interface ControlPoint {
  id: number;
  exam_id: number;
  room_id: number;
  room_name: string | null;
  control_type: ControlType;
  is_active: boolean;
  active_responsibles_count: number;
  is_current: boolean;
  can_transfer_to_empty_room?: boolean;
  responsibles: ControlPointResponsible[];
}

export interface ControlPointAssignment {
  id: number;
  control_point_id: number;
  user_id: number;
  started_at: string;
  ended_at: string | null;
}

export interface ControlPointsResponse {
  current_assignment: ControlPointAssignment | null;
  control_points: ControlPoint[];
  unavailable_auxiliary_ids?: number[];
}

export interface JoinControlPointResponse {
  message: string;
  assignment: ControlPointAssignment;
}

export interface RotationAssignment {
  assignment_id: number;
  user_id: number;
  name: string | null;
  control_point_id: number;
  room_id: number;
  room_name: string | null;
  control_type: ControlType;
  started_at: string;
  ended_at: string | null;
}

export interface RotationRequest {
  id: number;
  status: RotationStatus;
  direction?: RotationDirection;
  created_at: string;
  responded_at: string | null;
  requester: RotationAssignment;
  receiver: RotationAssignment;
}

export interface RotationRequestsResponse {
  requests: RotationRequest[];
}

export interface RotationRequestResponse {
  message: string;
  request: RotationRequest;
}

export interface RotationResponse {
  message: string;
  request: RotationRequest;
  requester_assignment?: ControlPointAssignment;
  receiver_assignment?: ControlPointAssignment;
}

export interface RotationHistoryItem {
  id: number;
  user_id: number;
  responsible_name: string | null;
  control_point_id: number;
  room_id: number;
  room_name: string | null;
  control_type: ControlType;
  started_at: string;
  ended_at: string | null;
}

export interface RotationHistoryResponse {
  history: RotationHistoryItem[];
}