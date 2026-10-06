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