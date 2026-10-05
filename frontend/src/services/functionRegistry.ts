import importRosterIcon from '../assets/importar_planilla.svg';
import processedRostersIcon from '../assets/planillas_importadas.svg';
import academicStaffIcon from '../assets/personal_academico.svg';
import studentsEnrolledIcon from '../assets/estudiantes_inscritos.svg';
import examDocIcon from '../assets/documento_examen.svg';

export type AppScreenId =
  | 'DASHBOARD'
  | 'EDIT_ROLES'
  | 'ACADEMIC_STAFF'
  | 'TEACHER_COURSES';

export interface SystemFunctionConfig {
  key: string;
  title: string;
  description: string;
  iconType: 'img' | 'svg_roles' | 'svg_personal' | 'svg_user_add' | 'svg_courses' | 'svg_schedule' | 'svg_status';
  iconSrc?: string;
  screen?: AppScreenId;
  action?: string;
}

export const systemFunctionsRegistry: Record<string, SystemFunctionConfig> = {
  LISTAR_PERSONAL_ACADEMICO: {
    key: 'LISTAR_PERSONAL_ACADEMICO',
    title: 'Personal Académico',
    description: 'Listar personal académico registrado',
    iconType: 'img',
    iconSrc: academicStaffIcon,
    screen: 'ACADEMIC_STAFF',
  },
  LISTAR_PLANILLAS_PROCESADAS: {
    key: 'LISTAR_PLANILLAS_PROCESADAS',
    title: 'Planillas Procesadas',
    description: 'Listar planillas procesadas y detalle',
    iconType: 'img',
    iconSrc: processedRostersIcon,
  },
  IMPORTAR_PADRON: {
    key: 'IMPORTAR_PADRON',
    title: 'Importar padrón',
    description: 'Importar padrón oficial de estudiantes',
    iconType: 'img',
    iconSrc: importRosterIcon,
    action: 'IMPORT_ROSTER',
  },
  EDITAR_ROLES: {
    key: 'EDITAR_ROLES',
    title: 'Editar Roles',
    description: 'Editar roles de una cuenta',
    iconType: 'svg_roles',
    screen: 'EDIT_ROLES',
  },
  EDITAR_DATOS_PERSONALES: {
    key: 'EDITAR_DATOS_PERSONALES',
    title: 'Editar datos Personales',
    description: 'Editar datos personales de cuenta propia',
    iconType: 'svg_personal',
    action: 'EDIT_PERSONAL_DATA',
  },
  REGISTRAR_PERSONAL_ACADEMICO: {
    key: 'REGISTRAR_PERSONAL_ACADEMICO',
    title: 'Registrar personal académico',
    description: 'Registrar nuevo personal académico',
    iconType: 'svg_user_add',
    action: 'REGISTER_ACADEMIC_STAFF',
  },
  VISUALIZAR_MATERIAS_ASIGNADAS: {
    key: 'VISUALIZAR_MATERIAS_ASIGNADAS',
    title: 'Visualizar Materias',
    description: 'Visualizar materias asignadas a cargo',
    iconType: 'svg_courses',
    screen: 'TEACHER_COURSES',
  },
  LISTAR_ESTUDIANTES_MATERIA: {
    key: 'LISTAR_ESTUDIANTES_MATERIA',
    title: 'Estudiantes inscritos en una materia',
    description: 'Listar estudiantes inscritos dentro de una materia',
    iconType: 'img',
    iconSrc: studentsEnrolledIcon,
    screen: 'TEACHER_COURSES',
  },
  PROGRAMAR_EXAMEN: {
    key: 'PROGRAMAR_EXAMEN',
    title: 'Programar Examen',
    description: 'Programar examen para una materia con asignación automática de aulas',
    iconType: 'svg_schedule',
    action: 'SCHEDULE_EXAM',
  },
  LISTAR_EXAMENES_MATERIA: {
    key: 'LISTAR_EXAMENES_MATERIA',
    title: 'Exámenes programados',
    description: 'Listar exámenes programados de una materia',
    iconType: 'img',
    iconSrc: examDocIcon,
    action: 'SCHEDULED_EXAMS',
  },
  GESTIONAR_HABILITACION_ESTUDIANTE: {
    key: 'GESTIONAR_HABILITACION_ESTUDIANTE',
    title: 'Estado de Habilitación',
    description: 'Cambiar estado de habilitación de un estudiante con motivo académico',
    iconType: 'svg_status',
    action: 'STUDENT_STATUS',
  },
};

export const SYSTEM_FUNCTIONS_REGISTRY = systemFunctionsRegistry;

export function getAuthorizedFunctions(tokenFunctions?: string[]): SystemFunctionConfig[] {
  const allConfigs = Object.values(systemFunctionsRegistry);

  if (!tokenFunctions || tokenFunctions.length === 0) {
    return allConfigs;
  }

  const authorizedSet = new Set(tokenFunctions.map((fn) => fn.toUpperCase().trim()));
  return allConfigs.filter((config) => authorizedSet.has(config.key));
}
