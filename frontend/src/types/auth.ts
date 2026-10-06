export const FUNCTION_CODES = {
  LIST_ACADEMIC_STAFF: 'LISTAR_PERSONAL_ACADEMICO',
  LIST_PROCESSED_ROSTERS: 'LISTAR_PLANILLAS_PROCESADAS',
  IMPORT_ROSTER: 'IMPORTAR_PADRON',
  EDIT_ROLES: 'EDITAR_ROLES',
  EDIT_PERSONAL_DATA: 'EDITAR_DATOS_PERSONALES',
  REGISTER_ACADEMIC_STAFF: 'REGISTRAR_PERSONAL_ACADEMICO',
  VIEW_ASSIGNED_COURSES: 'VISUALIZAR_MATERIAS_ASIGNADAS',
  LIST_COURSE_STUDENTS: 'LISTAR_ESTUDIANTES_MATERIA',
  SCHEDULE_EXAM: 'PROGRAMAR_EXAMEN',
  LIST_COURSE_EXAMS: 'LISTAR_EXAMENES_MATERIA',
  MANAGE_STUDENT_ELIGIBILITY: 'GESTIONAR_HABILITACION_ESTUDIANTE',
} as const;

export type FunctionCode =
  typeof FUNCTION_CODES[keyof typeof FUNCTION_CODES];

export interface TokenSession {
  token: string;
  is_active: boolean;
  token_type: string;
  expires_in: number;
}

export interface AuthTokenClaims {
  sub: string | number;
  roles?: unknown;
  functions?: unknown;
  name?: unknown;
  email?: unknown;
  ci?: unknown;
  exp?: number;
}

export interface UserSession extends TokenSession {
  user_id: number;
  full_name: string;
  email: string;
  ci: string | null;
  roles: string[];
  functions: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface LoginResponse
  extends ApiResponse<TokenSession> {}