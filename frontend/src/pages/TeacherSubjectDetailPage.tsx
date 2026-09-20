import { useTeacherSubject } from '../hooks/useTeacherSubjects';
import type { ReactNode } from 'react';

interface TeacherSubjectDetailPageProps {
  apiBaseUrl: string;
  token: string;
  teacherId: number;
  courseGroupId: string;
  onBack: () => void;
}

export function TeacherSubjectDetailPage({
  apiBaseUrl,
  token,
  teacherId,
  courseGroupId,
  onBack,
}: TeacherSubjectDetailPageProps) {
  const { data: subject, error, loading, retry } = useTeacherSubject(apiBaseUrl, token, teacherId, courseGroupId);

  return (
    <main className="teacher-detail-container">
      <button type="button" className="back-btn" onClick={onBack} aria-label="Volver a materias">
        <span aria-hidden="true">{'<'}</span>
      </button>

      {loading && <TeacherDetailStatus text="Cargando materia..." />}

      {!loading && error && (
        <TeacherDetailStatus text={error}>
          <button type="button" className="btn-secondary compact-btn" onClick={() => retry()}>
            Reintentar
          </button>
        </TeacherDetailStatus>
      )}

      {!loading && !error && subject && (
        <>
          <header className="subject-detail-header">
            <p className="detail-eyebrow">Materia asignada</p>
            <h1 className="subject-detail-title">
              {subject.subjectCode} - {subject.subjectName}
            </h1>
            <dl className="detail-meta-grid">
              <div>
                <dt>Grupo</dt>
                <dd>{subject.groupCode}</dd>
              </div>
              <div>
                <dt>Gestion</dt>
                <dd>{subject.academicTerm}</dd>
              </div>
              <div>
                <dt>Inscritos</dt>
                <dd>{subject.enrolledCount}</dd>
              </div>
            </dl>
          </header>

          <TeacherDetailStatus text="La nomina oficial de estudiantes se administra desde las planillas procesadas." />
        </>
      )}
    </main>
  );
}

function TeacherDetailStatus({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <section className="teacher-status" role="status" aria-live="polite">
      <p>{text}</p>
      {children}
    </section>
  );
}
