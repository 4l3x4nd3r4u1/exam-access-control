import { useEffect, useState } from "react";
import examListHeroIcon from "../assets/documento_examen.svg";
import { examService } from "../services/examService";
import type { EstadoExamen, ExamenCurso } from "../types/exam";
import type { TeacherCourse } from "../types/course";

interface TeacherExamsViewProps {
    course: TeacherCourse;
    onBack: () => void;
    onLogout?: () => void;
}

function renderizarIconoEstado(estado?: EstadoExamen) {
    switch (estado) {
        case "Finalizado":
            return (
                <div className="teacher-exam-status-icon finalizado" aria-label="Finalizado">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>
            );
        case "En curso":
            return (
                <div className="teacher-exam-status-icon en-curso" aria-label="En curso">
                    <div className="teacher-exam-bullseye-inner" />
                </div>
            );
        case "Próximamente":
        default:
            return (
                <div className="teacher-exam-status-icon proximamente" aria-label="Próximamente">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                        <rect x="7" y="13" width="2" height="2" fill="currentColor" />
                        <rect x="11" y="13" width="2" height="2" fill="currentColor" />
                        <rect x="15" y="13" width="2" height="2" fill="currentColor" />
                    </svg>
                </div>
            );
    }
}

function renderizarInsigniaEstado(estado?: EstadoExamen) {
    switch (estado) {
        case "Finalizado":
            return <span className="teacher-exam-badge finalizado">Finalizado</span>;
        case "En curso":
            return <span className="teacher-exam-badge en-curso">En curso</span>;
        case "Próximamente":
        default:
            return <span className="teacher-exam-badge proximamente">Próximamente</span>;
    }
}

export function TeacherExamsView({ course, onBack }: TeacherExamsViewProps) {
    const [examenes, setExamenes] = useState<ExamenCurso[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let estaMontado = true;

        examService.getCourseExams(course.course_group_id)
            .then((items) => {
                if (estaMontado) {
                    setExamenes(items);
                }
            })
            .catch((errorPeticion: unknown) => {
                if (estaMontado) {
                    setError(errorPeticion instanceof Error ? errorPeticion.message : "No se pudo cargar la lista de exámenes.");
                }
            })
            .finally(() => {
                if (estaMontado) {
                    setCargando(false);
                }
            });

        return () => {
            estaMontado = false;
        };
    }, [course.course_group_id]);

    return (
        <main className="app-shell teacher-exams-screen">
            <header className="teacher-exams-topbar">
                <button type="button" className="teacher-course-detail-back" onClick={onBack} aria-label="Volver a la materia">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M20 12H4M10 6l-6 6 6 6" />
                    </svg>
                </button>
            </header>

            <section className="teacher-exams-hero">
                <img src={examListHeroIcon} alt="Exámenes" className="teacher-exams-hero-img" />
                <h1 className="teacher-exams-title">
                    Lista de<br />examenes
                </h1>
            </section>

            <section className="teacher-exams-container" aria-label="Exámenes programados">
                <h2 className="teacher-exams-section-label">EXAMENES PROGRAMADOS</h2>

                {cargando && <p className="teacher-courses-feedback">Cargando exámenes...</p>}
                {error && <p className="teacher-courses-feedback teacher-courses-error" role="alert">{error}</p>}

                {!cargando && !error && (
                    <div className="teacher-exams-list">
                        {examenes.map((examen) => (
                            <article className="teacher-exam-card" key={examen.id}>
                                {renderizarIconoEstado(examen.estado || examen.status)}

                                <div className="teacher-exam-card-content">
                                    <div className="teacher-exam-card-header">
                                        <h3 className="teacher-exam-card-title">{examen.titulo || examen.title}</h3>
                                        {renderizarInsigniaEstado(examen.estado || examen.status)}
                                    </div>

                                    <div className="teacher-exam-meta-row">
                                        <span className="teacher-exam-meta-item">
                                            <svg viewBox="0 0 24 24" className="teacher-exam-meta-icon" aria-hidden="true">
                                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                                <line x1="16" y1="2" x2="16" y2="6" />
                                                <line x1="8" y1="2" x2="8" y2="6" />
                                                <line x1="3" y1="10" x2="21" y2="10" />
                                            </svg>
                                            {examen.fecha || examen.date}
                                        </span>

                                        <span className="teacher-exam-meta-item">
                                            <svg viewBox="0 0 24 24" className="teacher-exam-meta-icon" aria-hidden="true">
                                                <circle cx="12" cy="12" r="10" />
                                                <polyline points="12 6 12 12 16 14" />
                                            </svg>
                                            {examen.hora_inicio || examen.start_time} - {examen.hora_fin || examen.end_time}
                                        </span>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
