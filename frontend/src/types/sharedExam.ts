export interface SharedExamHostRoom {
  room_id: string;
  room_name: string;
  capacity: number;
  assigned_capacity: number;
  remaining_capacity: number;
  assistant_id?: number | null;
}

export interface SharedExamInfo {
  exam_id: number;
  exam_type: string;
  date: string | null;
  start_time: string;
  end_time: string;
  subject_code: string;
  subject_name: string;
  academic_term: string;
  host_teacher_name: string;
  host_teacher_email: string;
  host_group_code: string;
  host_course_group_id: number;
  host_enrolled_count?: number;
  co_teacher_name?: string;
  co_teacher_email?: string;
  co_group_code?: string;
  co_course_group_id?: number;
  co_enrolled_count?: number;
  all_rooms?: SharedExamHostRoom[];
  host_rooms: SharedExamHostRoom[];
  total_capacity?: number;
  total_host_capacity: number;
  total_assigned?: number;
  total_host_assigned: number;
  total_remaining_capacity: number;
}

export interface ExtraRoomItem {
  room_id: number | string;
  room_name: string;
  max_capacity: number;
  assigned_capacity: number;
  is_manual?: boolean;
}

export interface SharedExamItem {
  shared_exam_id: number;
  invitation_id: number;
  status: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO';
  message: string | null;
  created_at: string | null;
  is_co_teacher: boolean;
  extra_rooms?: ExtraRoomItem[];
  exam: SharedExamInfo | null;
  invited_group?: {
    course_group_id: number;
    group_code: string;
    academic_term: string;
    subject_name: string;
  } | null;
  assigned_course_group_ids?: number[];
}

export type SharedExamInvitation = SharedExamItem;

export interface ExtraRoomPayload {
  room_id?: number | string;
  room_name?: string;
  assigned_capacity: number;
  auxiliar_id?: number | null;
}

export interface AcceptSharedExamPayload {
  course_group_id?: number;
  course_group_ids?: number[];
  rooms?: ExtraRoomPayload[];
}
