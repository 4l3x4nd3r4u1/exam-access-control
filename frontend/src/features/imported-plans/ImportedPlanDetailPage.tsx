import { useImportedPlanDetail } from './hooks';
import type { ReactNode } from 'react';

interface ImportedPlanDetailPageProps {
  apiBaseUrl: string;
  token: string;
  courseGroupId: string;
  onBack: () => void;
}

export function ImportedPlanDetailPage({
  apiBaseUrl,
  token,
  courseGroupId,
  onBack,
}: ImportedPlanDetailPageProps) {
  const { data, error, loading, retry } = useImportedPlanDetail(apiBaseUrl, token, courseGroupId);
  const plan = data?.plan;
  const students = data?.students ?? [];

  return (
    <main className="plan-detail-container">
      <button type="button" className="back-btn" onClick={onBack} aria-label="Volver a planillas importadas">
        <span aria-hidden="true">←</span>
      </button>

      {loading && <DetailStatus text="Cargando nómina..." />}

      {!loading && error && (
        <DetailStatus text={error}>
          <button type="button" className="btn-secondary compact-btn" onClick={() => retry()}>
            Reintentar
          </button>
        </DetailStatus>
      )}

      {!loading && !error && plan && (
        <>
          <header className="detail-header">
            <p className="detail-eyebrow">Planilla oficial</p>
            <h1 className="detail-title">
              {plan.subject_code} - {plan.subject_name}
            </h1>
            <dl className="detail-meta">
              <div>
                <dt>Docente</dt>
                <dd>{plan.teacher_name || 'Sin docente asignado'}</dd>
              </div>
              <div>
                <dt>Grupo</dt>
                <dd>{plan.group_code}</dd>
              </div>
              <div>
                <dt>Gestión</dt>
                <dd>{plan.academic_term}</dd>
              </div>
            </dl>
          </header>

          {students.length === 0 ? (
            <DetailStatus text="Esta planilla no tiene estudiantes registrados." />
          ) : (
            <section className="students-list" aria-label="Nómina de estudiantes">
              <div className="students-row students-head" aria-hidden="true">
                <span>SIS</span>
                <span>CI</span>
                <span>Nombre</span>
              </div>
              {students.map((student) => (
                <article className="students-row" key={`${plan.course_group_id}-${student.sis}`}>
                  <span className="student-cell" data-label="SIS">{student.sis}</span>
                  <span className="student-cell" data-label="CI">{student.ci}</span>
                  <span className="student-cell student-name" data-label="Nombre">{student.full_name}</span>
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
