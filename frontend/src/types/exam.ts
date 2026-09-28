export type ExamStatus = "Finalizado" | "En curso" | "Próximamente";
export type EstadoExamen = ExamStatus;

export interface CourseExam {
    id: string | number;
    course_group_id: string;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    status: ExamStatus;

    // Campos opcionales de base de datos en snake_case y español
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

export type RespuestaExamenesCurso = CourseExamsResponse;
