import enrolledStudentsIcon from '../assets/estudiantes_inscritos.svg';
import type { TeacherCourse } from '../types/course';

interface TeacherCourseDetailViewProps {
  course: TeacherCourse;
  subjectIcon: string;
  onBack: () => void;
  onLogout: () => void;
  onOpenStudents: () => void;
}

function enrollmentColor(total: number): string {
  return total >= 400 ? '#e32929' : '#f29e00';
}

export function TeacherCourseDetailView({ course, subjectIcon, onBack, onLogout, onOpenStudents }: TeacherCourseDetailViewProps) {
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
        <img src={subjectIcon} alt="" />
        <h1>{course.subject_name}</h1>
        <div className="teacher-course-detail-meta">
          <span>Grupo {course.group_code}</span>
          <span><i style={{ background: enrollmentColor(course.total_enrolled) }} />{course.total_enrolled} inscritos</span>
          <span className="teacher-course-term"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="1.5" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>{course.academic_term}</span>
        </div>
      </section>

      <section className="teacher-course-actions-grid" aria-label="Opciones de la materia">
        <button type="button" className="teacher-course-action-card" onClick={onOpenStudents}>
          <span className="teacher-course-action-chevron" aria-hidden="true">›</span>
          <img src={enrolledStudentsIcon} alt="" />
          <span>Estudiantes<br />inscritos</span>
        </button>
      </section>
    </main>
  );
}
