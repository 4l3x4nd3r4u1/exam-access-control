import type { ReactNode } from 'react';
import { useProcessedRosterDetail } from '../hooks/useProcessedRosters';

interface ProcessedRosterDetailPageProps {
  apiBaseUrl: string;
  token: string;
  courseGroupId: string;
  onBack: () => void;
}

export function ProcessedRosterDetailPage({
  apiBaseUrl,
  token,
  courseGroupId,
  onBack,
}: ProcessedRosterDetailPageProps) {
  const { data, error, loading, retry } = useProcessedRosterDetail(apiBaseUrl, token, courseGroupId);
  const roster = data?.roster;
  const students = data?.students ?? [];

  return (
    <main className="plan-detail-container">
      <button type="button" className="back-btn" onClick={onBack} aria-label="Volver a planillas importadas">
        <span aria-hidden="true">{'<'}</span>
      </button>

      {loading && <DetailStatus text="Cargando nomina..." />}

      {!loading && error && (
        <DetailStatus text={error}>
          <button type="button" className="btn-secondary compact-btn" onClick={() => retry()}>
            Reintentar
          </button>
        </DetailStatus>
      )}

      {!loading && !error && roster && (
        <>
          <header className="detail-header">
            <p className="detail-eyebrow">Planilla oficial</p>
            <h1 className="detail-title">
              {roster.subjectCode} - {roster.subjectName}
            </h1>
            <dl className="detail-meta">
              <div>
                <dt>Docente</dt>
                <dd>{roster.teacherName || 'Sin docente asignado'}</dd>
              </div>
              <div>
                <dt>Grupo</dt>
                <dd>{roster.groupCode}</dd>
              </div>
              <div>
                <dt>Gestion</dt>
                <dd>{roster.academicTerm}</dd>
              </div>
            </dl>
          </header>

          {students.length === 0 ? (
            <DetailStatus text="Esta planilla no tiene estudiantes registrados." />
          ) : (
            <section className="students-list" aria-label="Nomina de estudiantes">
              <div className="students-row students-head" aria-hidden="true">
                <span>SIS</span>
                <span>CI</span>
                <span>Nombre</span>
              </div>
              {students.map((student) => (
                <article className="students-row" key={`${roster.courseGroupId}-${student.sis}`}>
                  <span className="student-cell" data-label="SIS">{student.sis}</span>
                  <span className="student-cell" data-label="CI">{student.ci}</span>
                  <span className="student-cell student-name" data-label="Nombre">{student.fullName}</span>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}

function DetailStatus({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <section className="plans-status" role="status" aria-live="polite">
      <p>{text}</p>
      {children}
    </section>
  );
}
