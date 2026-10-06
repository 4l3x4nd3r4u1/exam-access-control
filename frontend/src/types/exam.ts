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

export interface ScheduleExamPayload {
    tipo_examen: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    aulas: string[];
    normas: string[];
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
