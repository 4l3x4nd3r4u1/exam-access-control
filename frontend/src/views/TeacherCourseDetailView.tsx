import { useState } from "react";
import enrolledStudentsIcon from "../assets/estudiantes_inscritos.svg";
import examDocumentIcon from "../assets/documento_examen.svg";
import defaultSubjectIcon from "../assets/icono_materia-2.svg";
import { ScheduleExamDrawer } from "../components/ScheduleExamDrawer";
import type { TeacherCourse } from "../types/course";

interface TeacherCourseDetailViewProps {
    course: TeacherCourse;
    subjectIcon?: string;
    onBack: () => void;
    onLogout: () => void;
    onOpenStudents: () => void;
    onOpenExams?: () => void;
}

function colorInscritos(total: number): string {
    return total >= 400 ? "#e32929" : "#f29e00";
}

function formatearTituloMateria(titulo: string): string {
    if (!titulo) return "";
    const tieneMinusculas = /[a-zñáéíóú]/.test(titulo);
    if (tieneMinusculas) return titulo;

    const palabrasMenores = new Set(["a", "de", "en", "la", "el", "los", "las", "y", "o", "del"]);
    return titulo
        .toLowerCase()
        .split(" ")
        .map((palabra, indice) => {
            if (indice > 0 && palabrasMenores.has(palabra)) {
                return palabra;
            }
            return palabra.charAt(0).toUpperCase() + palabra.slice(1);
        })
        .join(" ");
}

export function TeacherCourseDetailView({
    course,
    subjectIcon,
    onBack,
    onLogout,
    onOpenStudents,
    onOpenExams,
}: TeacherCourseDetailViewProps) {
    const [isScheduleExamOpen, setIsScheduleExamOpen] = useState(false);
    const iconoMateria = course.subject_name?.toLowerCase().includes("program")
        ? defaultSubjectIcon
        : (subjectIcon || defaultSubjectIcon);

    const tituloMateria = formatearTituloMateria(course.subject_name);

    return (
        <main className="app-shell teacher-course-detail-screen">
            <header className="teacher-course-detail-topbar">
                <button type="button" className="teacher-course-detail-back" onClick={onBack} aria-label="Volver a materias">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M20 12H4M10 6l-6 6 6 6" />
                    </svg>
                </button>
                <div className="teacher-courses-actions">
                    <button type="button" className="teacher-courses-icon-button" aria-label="Cambiar apariencia">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="12" cy="12" r="3.25" />
                            <path d="M12 2v2.25M12 19.75V22M4.93 4.93l1.59 1.59M17.48 17.48l1.59 1.59M2 12h2.25M19.75 12H22M4.93 19.07l1.59-1.59M17.48 6.52l1.59-1.59" />
                        </svg>
                    </button>
                    <button type="button" className="teacher-courses-icon-button" onClick={onLogout} aria-label="Cerrar sesión">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="12" cy="8" r="4.25" />
                            <path d="M4.5 21c.85-4 3.3-6 7.5-6s6.65 2 7.5 6" />
                        </svg>
                    </button>
                </div>
            </header>

            <section className="teacher-course-detail-hero">
                <img src={iconoMateria} alt="" />
                <h1>{tituloMateria}</h1>
                <div className="teacher-course-detail-meta">
                    <span>Grupo {course.group_code}</span>
                    <span><i style={{ background: colorInscritos(course.total_enrolled) }} />{course.total_enrolled} inscritos</span>
                    <span className="teacher-course-term">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <rect x="4" y="5" width="16" height="15" rx="1.5" />
                            <path d="M8 3v4M16 3v4M4 10h16" />
                        </svg>
                        {course.academic_term}
                    </span>
                </div>
            </section>

            <section className="teacher-course-actions-grid" aria-label="Opciones de la materia">
                <button
                    type="button"
                    className="teacher-course-action-card"
                    onClick={onOpenStudents}
                    aria-label="Ver estudiantes inscritos"
                >
                    <span className="teacher-course-action-chevron" aria-hidden="true">›</span>
                    <img src={enrolledStudentsIcon} alt="" />
                    <span>Estudiantes<br />inscritos</span>
                </button>

                <button
                    type="button"
                    className="teacher-course-action-card"
                    onClick={() => setIsScheduleExamOpen(true)}
                    aria-label="Programar Examen"
                >
                    <span className="teacher-course-action-chevron" aria-hidden="true">›</span>
                    <img src={examDocumentIcon} alt="" />
                    <span>Programar<br />Examen</span>
                </button>

                <button
                    type="button"
                    className="teacher-course-action-card"
                    onClick={onOpenExams}
                    aria-label="Ver exámenes programados"
                >
                    <span className="teacher-course-action-chevron" aria-hidden="true">›</span>
                    <img src={examDocumentIcon} alt="" />
                    <span>Examenes<br />Programados</span>
                </button>

                <button
                    type="button"
                    className="teacher-course-action-card disabled-action"
                    aria-label="Estado de habilitación"
                >
                    <img src={examDocumentIcon} alt="" />
                    <span>Estado de<br />habilitacion</span>
                </button>
            </section>

            <ScheduleExamDrawer
                isOpen={isScheduleExamOpen}
                onClose={() => setIsScheduleExamOpen(false)}
                course={course}
            />
        </main>
    );
}
