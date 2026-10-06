import { useEffect, useState } from 'react';

import { CourseGroupInfo } from '../components/CourseGroupInfo';
import { examService } from '../services/examService';
import { formatExamType, formatTime } from '../utils/examFormat';
import type { CourseGroup } from '../types/course';
import type { ScheduledExam } from '../types/exam';

interface ScheduledExamsViewProps {
  courseGroup: CourseGroup;
  onBack: () => void;
  onLogout: () => void;
}

export function ScheduledExamsView({
  courseGroup,
  onBack,
  onLogout,
}: ScheduledExamsViewProps) {
  const [exams, setExams] = useState<ScheduledExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    examService
      .getScheduledExams(courseGroup.course_group_id)
      .then((items) => {
        if (isMounted) setExams(items);
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'No se pudo cargar la lista de exámenes.',
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

      <h1 className="cg-title">
        Exámenes Programados
        <br />
        {courseGroup.subject_name}
      </h1>

      <CourseGroupInfo courseGroup={courseGroup} />

      <section className="cg-exam-list" aria-label="Exámenes programados">
        {isLoading && <p className="cg-feedback">Cargando exámenes...</p>}

        {error && (
          <p className="cg-feedback cg-error" role="alert">
            {error}
          </p>
        )}

        {!isLoading && !error && exams.length === 0 && (
          <p className="cg-feedback">
            No hay exámenes programados para esta materia.
          </p>
        )}

        {!isLoading &&
          !error &&
          exams.map((exam) => (
            <article className="cg-exam" key={exam.exam_id}>
              <h2>{formatExamType(exam.exam_type)}</h2>

              <dl>
                <div>
                  <dt>Aulas:</dt>
                  <dd>
                    {exam.rooms.length > 0
                      ? exam.rooms.map((room) => room.room_name).join(', ')
                      : 'Sin aulas asignadas'}
                  </dd>
                </div>
                <div>
                  <dt>Fecha:</dt>
                  <dd>{exam.date}</dd>
                </div>
                <div>
                  <dt>Hora inicio:</dt>
                  <dd>{formatTime(exam.start_time)}</dd>
                </div>
                <div>
                  <dt>Hora fin:</dt>
                  <dd>{formatTime(exam.end_time)}</dd>
                </div>
              </dl>
            </article>
          ))}
      </section>
    </main>
  );
}
