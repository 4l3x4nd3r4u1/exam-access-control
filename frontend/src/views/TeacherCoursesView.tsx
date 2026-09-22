import { useEffect, useState } from 'react';
import subjectIconOne from '../assets/icono_materia-1.svg';
import subjectIconTwo from '../assets/icono_materia-2.svg';
import { courseService } from '../services/courseService';
import type { TeacherCourse } from '../types/course';
import { TeacherCourseDetailView } from './TeacherCourseDetailView';
import { TeacherStudentsView } from './TeacherStudentsView';

interface TeacherCoursesViewProps {
  teacherId: number;
  onLogout: () => void;
}

function enrollmentColor(total: number): string {
  if (total >= 400) return '#e32929';
  return '#f29e00';
}

export function TeacherCoursesView({ teacherId, onLogout }: TeacherCoursesViewProps) {
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<{ course: TeacherCourse; icon: string } | null>(null);
  const [isStudentsViewOpen, setIsStudentsViewOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    courseService.getTeacherCourses(teacherId)
      .then((items) => {
        if (isMounted) setCourses(items);
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar las materias.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [teacherId]);

  const totalStudents = courses.reduce((total, course) => total + course.total_enrolled, 0);
  const academicTerm = courses[0]?.academic_term ?? '';

  if (selectedCourse) {
    if (isStudentsViewOpen) {
      return <TeacherStudentsView course={selectedCourse.course} onBack={() => setIsStudentsViewOpen(false)} onLogout={onLogout} />;
    }

    return (
      <TeacherCourseDetailView
        course={selectedCourse.course}
        subjectIcon={selectedCourse.icon}
        onBack={() => setSelectedCourse(null)}
        onLogout={onLogout}
        onOpenStudents={() => setIsStudentsViewOpen(true)}
      />
    );
  }

  return (
    <main className="app-shell teacher-courses-screen">
      <header className="teacher-courses-header">
        <div className="teacher-courses-heading-row">
          <h1>Materias</h1>
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
        </div>

        <div className="teacher-courses-summary">
          <span>{totalStudents} estudiantes</span>
          <span>Asignadas <b>{courses.length}</b></span>
          <span>{academicTerm}</span>
        </div>
      </header>

      {isLoading && <p className="teacher-courses-feedback">Cargando materias...</p>}
      {error && <p className="teacher-courses-feedback teacher-courses-error" role="alert">{error}</p>}
      {!isLoading && !error && (
        <section className="teacher-courses-list" aria-label="Materias asignadas">
          {courses.map((course, index) => (
            <button type="button" className="teacher-course-card" key={course.course_group_id} onClick={() => {
              setIsStudentsViewOpen(false);
              setSelectedCourse({ course, icon: index % 2 === 0 ? subjectIconOne : subjectIconTwo });
            }}>
              <img src={index % 2 === 0 ? subjectIconOne : subjectIconTwo} alt="" />
              <div className="teacher-course-content">
                <h2>{course.subject_name}</h2>
                <div className="teacher-course-meta">
                  <span>Grupo {course.group_code}</span>
                  <span><i style={{ background: enrollmentColor(course.total_enrolled) }} />{course.total_enrolled} inscritos</span>
                  <span className="teacher-course-term"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="1.5" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>{course.academic_term}</span>
                </div>
              </div>
              <span className="teacher-course-chevron" aria-hidden="true">›</span>
            </button>
          ))}
        </section>
      )}
    </main>
  );
}
