// ── Puntos de control (GET /exams) ──────────────────────────────────────
export interface ControlExamRoom {
  room_id: string;
  room_name: string;
  assistant_id: number | null;
  /** El usuario autenticado puede usar esta aula como punto de control. */
  can_interact: boolean;
}

export interface ControlExam {
  exam_id: string;
  course_group_id: string;
  subject_name: string;
  group: string;
  exam_type: string;
  date: string;
  start_time: string;
  end_time: string;
  general_rules: string[];
  rooms: ControlExamRoom[];
}

export interface ControlExamsResponse {
  success: boolean;
  data: ControlExam[];
  message: string;
}

export type ControlExamStatus = 'EN_CURSO' | 'PROXIMAMENTE' | 'FINALIZADO';

// ── Control de acceso ───────────────────────────────────────────────────
export interface AccessStudent {
  user_id: number;
  codigo_sis: string;
  ci: string;
  full_name: string;
}

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

export type EntryResult =
  | 'HABILITADO'
  | 'YA REGISTRÓ INGRESO'
  | 'INHABILITADO'
  | 'AULA INCORRECTA'
  | 'NO FIGURA EN EL EXAMEN'
  | 'ESTUDIANTE NO ENCONTRADO';

export interface EntryAccess {
  result: EntryResult;
  ineligibility_reason?: string | null;
  assigned_room_id: number | null;
  assigned_room_name: string | null;
  check_in_time: string | null;
  norma_particular: string | null;
}

/** POST /exam-access/check */
export interface EntryCheckResponse {
  success: boolean;
  message: string;
  data: {
    student: AccessStudent | null;
    access: EntryAccess;
    expulsion_history: ExpulsionHistoryItem[];
  };
}

export type DuringExamResult =
  | 'PRESENTE'
  | 'INGRESO EXCEPCIONAL'
  | 'EXPULSADO'
  | 'AUSENTE'
  | 'NO FIGURA EN EL EXAMEN';

export interface DuringExamStudentState {
  result: DuringExamResult;
  status_id: number | null;
  assigned_room_id: number | null;
  assigned_room_name: string | null;
  check_in_time: string | null;
  norma_particular: string | null;
  observations: string | null;
  expulsion_reason: string | null;
}

/** POST /exam-access/during-exam/check */
export interface DuringExamResponse {
  success: boolean;
  message: string;
  data: {
    student: AccessStudent;
    exam_student: DuringExamStudentState;
    expulsion_history: ExpulsionHistoryItem[];
  };
}
