import { useEffect, useState } from 'react';
import enrolledStudentsIcon from '../assets/estudiantes_inscritos.svg';
import { courseService } from '../services/courseService';
import type { EnrolledStudent, TeacherCourse } from '../types/course';
import { StudentStatusDrawer } from '../components/StudentStatusDrawer';

interface TeacherStudentsViewProps {
  course: TeacherCourse;
  onBack: () => void;
  onLogout: () => void;
}

function displayStatus(status: EnrolledStudent['status']): string {
  return status === 'INHABILITADO' ? 'Inhabilitado' : 'Habilitado';
}

export function TeacherStudentsView({ course, onBack, onLogout }: TeacherStudentsViewProps) {
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<EnrolledStudent | null>(null);

  useEffect(() => {
    let isMounted = true;

    courseService.getEnrolledStudents(course.course_group_id)
      .then((items) => {
        if (isMounted) setStudents(items);
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar la nómina.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [course.course_group_id]);

  return (
    <main className="app-shell teacher-students-screen">
      <header className="teacher-students-topbar">
        <button type="button" className="teacher-course-detail-back" onClick={onBack} aria-label="Volver a la materia">
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

      <section className="teacher-students-hero">
        <img src={enrolledStudentsIcon} alt="" />
        <h1>Estudiantes<br />inscritos</h1>
      </section>

      <section className="teacher-students-table" aria-label="Estudiantes inscritos">
        <div className="teacher-students-table-header"><span>sis</span><span>nombre</span><span>estado</span></div>
        {isLoading && <p className="teacher-courses-feedback">Cargando estudiantes...</p>}
        {error && <p className="teacher-courses-feedback teacher-courses-error" role="alert">{error}</p>}
        {!isLoading && !error && students.map((student) => (
          <button type="button" className="teacher-students-table-row" key={student.studentKey} onClick={() => setSelectedStudent(student)}>
            <span>{student.studentKey}</span><span>{student.fullName}</span><span>{displayStatus(student.status)}</span>
          </button>
        ))}
      </section>

      {selectedStudent && (
        <StudentStatusDrawer
          isOpen
          courseGroupId={course.course_group_id}
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onSaved={(updatedStudent) => {
            setStudents((current) => current.map((student) => (
              student.studentKey === updatedStudent.studentKey ? updatedStudent : student
            )));
          }}
        />
      )}
    </main>
  );
}
