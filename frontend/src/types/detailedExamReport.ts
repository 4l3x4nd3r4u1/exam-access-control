export interface DetailedExamRoom {
  room_id: string;
  room_name: string;
  assigned_capacity: number;
  assistant_id: number | null;
  assistant_name: string | null;
}

export interface FinishedExamItem {
  exam_id: string;
  course_group_id: string;
  subject_name: string;
  subject_code: string;
  group: string;
  academic_term: string;
  teacher_name: string;
  exam_type: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'FINALIZADO';
  rooms: DetailedExamRoom[];
  general_rules?: string[];
}

export interface FinishedExamsResponse {
  success: boolean;
  data: FinishedExamItem[];
  meta?: {
    exam_types?: string[];
    gestiones?: string[];
  };
  message: string;
}

export interface DetailedExamSummary {
  total_assigned: number;
  total_entered: number;
  total_absent: number;
  total_present: number;
  total_exceptional: number;
  total_observations: number;
  total_expulsions: number;
  total_incidents: number;
  total_events: number;
}

export type DetailedExamEventType =
  | 'EXPULSION'
  | 'AUTORIZACION'
  | 'OBSERVACION'
  | 'INCIDENTE'
  | 'INGRESO';

export type DetailedExamEventCategory =
  | 'EXPULSION'
  | 'OBSERVACION'
  | 'INCIDENTE'
  | 'INGRESO';

export interface DetailedExamEvent {
  id: string;
  type: DetailedExamEventType;
  category: DetailedExamEventCategory;
  title: string;
  subtitle: string;
  room_name: string;
  time: string;
  timestamp: string;
  actor_name: string;
  student_name: string | null;
  student_sis: string | null;
  detail: string;
}

export interface DetailedExamRosterItem {
  user_id: number;
  nombre: string;
  codigo_sis: string;
  ci: string;
  aula: string;
  estado: string;
  hora_ingreso: string | null;
  observaciones: string | null;
  motivo_expulsion: string | null;
}

export interface GeneratedDetailedReport {
  id: number;
  file_name: string;
  generated_at: string;
  generated_by: string;
  summary: DetailedExamSummary;
  included_sections: string[];
}

export interface DetailedExamReportDetail {
  exam: FinishedExamItem;
  summary: DetailedExamSummary;
  events: DetailedExamEvent[];
  roster: DetailedExamRosterItem[];
  generated_reports: GeneratedDetailedReport[];
}

export interface DetailedExamDetailResponse {
  success: boolean;
  data: DetailedExamReportDetail;
  message: string;
}

export interface GenerateDetailedReportResponse {
  success: boolean;
  data: {
    report: GeneratedDetailedReport;
    generated_reports: GeneratedDetailedReport[];
  };
  message: string;
}
