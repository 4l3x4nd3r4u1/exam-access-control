import { useEffect, useState } from 'react';

import enrolledStudentsIcon from '../assets/estudiantes_inscritos.svg';
import { CourseGroupInfo } from '../components/CourseGroupInfo';
import { courseService } from '../services/courseService';
import type { CourseGroup, EnrolledStudent } from '../types/course';

interface EnrolledStudentsViewProps {
  courseGroup: CourseGroup;
  onBack: () => void;
  onLogout: () => void;
}

function displayStatus(status: EnrolledStudent['status']): string {
  return status === 'INHABILITADO' ? 'Inhabilitado' : 'Habilitado';
}

export function EnrolledStudentsView({
  courseGroup,
  onBack,
  onLogout,
}: EnrolledStudentsViewProps) {
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    courseService
      .getEnrolledStudents(courseGroup.course_group_id)
      .then((items) => {
        if (isMounted) setStudents(items);
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'No se pudo cargar la nómina de estudiantes.',
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [courseGroup.course_group_id]);

  return (
    <main className="app-shell cg-screen">
      <header className="cg-topbar">
        <button
          type="button"
          className="cg-icon-button"
          onClick={onBack}
          aria-label="Volver al panel"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12H4M10 6l-6 6 6 6" />
          </svg>
        </button>

        <button
          type="button"
          className="cg-icon-button"
          onClick={onLogout}
          aria-label="Cerrar sesión"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4.25" />
            <path d="M4.5 21c.85-4 3.3-6 7.5-6s6.65 2 7.5 6" />
          </svg>
        </button>
      </header>

      <img className="cg-hero-icon" src={enrolledStudentsIcon} alt="" />

      <h1 className="cg-title">
        Estudiantes inscritos
        <br />
        {courseGroup.subject_name}
      </h1>

      <CourseGroupInfo courseGroup={courseGroup} />

      <section className="cg-students" aria-label="Estudiantes inscritos">
        <div className="cg-students-header">
          <span>sis</span>
          <span>nombre</span>
          <span>estado</span>
        </div>

        {isLoading && <p className="cg-feedback">Cargando estudiantes...</p>}

        {error && (
          <p className="cg-feedback cg-error" role="alert">
            {error}
          </p>
        )}

        {!isLoading && !error && students.length === 0 && (
          <p className="cg-feedback">
            No hay estudiantes inscritos en esta materia.
          </p>
        )}

        {!isLoading &&
          !error &&
          students.map((student) => (
            <div className="cg-students-row" key={student.studentKey}>
              <span>{student.studentKey}</span>
              <span>{student.fullName}</span>
              <span
                className={
                  student.status === 'INHABILITADO' ? 'is-disabled' : undefined
                }
              >
                {displayStatus(student.status)}
              </span>
            </div>
          ))}
      </section>
    </main>
  );
}
