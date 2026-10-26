export interface ControlPointRoom {
  room_id: string;
  room_name: string;
  assistant_id: number | null;
  can_interact: boolean;
}

export interface ControlPointExam {
  exam_id: string;
  course_group_id: string;
  subject_name: string;
  group: string;
  exam_type: string;
  date: string;
  start_time: string;
  end_time: string;
  general_rules: string[];
  rooms: ControlPointRoom[];
}

export interface ControlPointSelection {
  exam: ControlPointExam;
  room: ControlPointRoom;
}

export interface AccessStudent {
  user_id: number;
  codigo_sis: string;
  ci: string;
  full_name: string;
}

export type AccessResultCode =
  | 'HABILITADO'
  | 'YA REGISTRÓ INGRESO'
  | 'INHABILITADO'
  | 'AULA INCORRECTA'
  | 'NO FIGURA EN EL EXAMEN'
  | 'NO INSCRITO EN LA MATERIA'
  | 'ESTUDIANTE NO ENCONTRADO';

export interface ExpulsionHistoryItem {
  exam_id: string;
  subject_name: string;
  group: string;
  academic_term: string;
  exam_type: string;
  date: string | null;
  room_name: string | null;
  reason: string | null;
}

export interface ExamAccessData {
  student?: AccessStudent | null;
  access: {
    result: AccessResultCode;
    assigned_room_id?: number | null;
    assigned_room_name?: string | null;
    check_in_time?: string | null;
    ineligibility_reason?: string | null;
    norma_particular?: string | null;
  };
  expulsion_history: ExpulsionHistoryItem[];
}

export interface ExamAccessResponse {
  success: boolean;
  data: ExamAccessData;
  message: string;
}

export interface CheckAccessPayload {
  identifier: string;
  exam_id: number;
  room_id: number;
}

export interface ObservationPayload {
  identifier: string;
  exam_id: number;
  observation: string;
}

export interface ObservationResponse {
  success: boolean;
  data: {
    student: AccessStudent;
    exam_id: number;
    observation: string;
    updated_at: string;
  };
  message: string;
}
