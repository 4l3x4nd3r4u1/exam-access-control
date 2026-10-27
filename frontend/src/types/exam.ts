export type ExamStatus =
  | 'Finalizado'
  | 'En curso'
  | 'Próximamente';

export type EstadoExamen = ExamStatus;

export interface CourseExam {
  id: string | number;
  course_group_id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  status: ExamStatus;

  materia_grupo_id?: string;
  titulo?: string;
  fecha?: string;
  hora_inicio?: string;
  hora_fin?: string;
  estado?: EstadoExamen;
  activo?: boolean;
}

export type ExamenCurso = CourseExam;

export interface CourseExamsResponse {
  success: boolean;
  data: CourseExam[];
  message: string;
}

export type RespuestaExamenesCurso =
  CourseExamsResponse;

export interface ExamType {
  value: number;
  label: string;
}

export interface ExamTypesResponse {
  success: boolean;
  data: ExamType[];
  message: string;
}

export interface AvailableRoom {
  room_id: string | number;
  room_name: string;
  capacity: number;
}

export interface AvailableRoomsResponse {
  success: boolean;
  data: AvailableRoom[];
  message: string;
}

export interface ScheduleExamRoomPayload {
  roomId: number;
  students: number[];
  auxiliarId?: number | null;
}

export interface ScheduleExamStudentRuleData {
  studentId: number;
  rule: string;
  codigoSis?: string;
}

export interface ScheduleExamPayload {
  examTypeId: number;
  date: string;
  startTime: string;
  rooms: ScheduleExamRoomPayload[];
  generalRules: string[];
  studentRules: ScheduleExamStudentRuleData[];
}

export interface StudentEnrollmentCheckResponse {
  success: boolean;
  message: string;
  data: {
    user_id: number;
    status: string;
    ineligibility_reason: string | null;
    enrollment_date?: string;
  } | null;
}

// ── Exámenes programados (GET /courses/{course_group_id}/exams) ──────────
export interface ScheduledExamRoom {
  room_id: string;
  room_name: string;
  assigned_capacity: number;
  assistant_id: number | null;
}

export interface ScheduledExam {
  exam_id: string;
  course_group_id: string;
  exam_type: string;
  date: string;
  start_time: string;
  end_time: string;
  rooms: ScheduledExamRoom[];
}

export interface ScheduledExamsResponse {
  success: boolean;
  data: ScheduledExam[];
  message: string;
}

