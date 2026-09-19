import { useTeacherSubjectDetail } from './hooks';
import type { ReactNode } from 'react';

interface TeacherSubjectDetailPageProps {
  apiBaseUrl: string;
  token: string;
  courseGroupId: string;
  onBack: () => void;
}

export function TeacherSubjectDetailPage({
  apiBaseUrl,
  token,
  courseGroupId,
  onBack,
}: TeacherSubjectDetailPageProps) {
  const { data, error, loading, retry } = useTeacherSubjectDetail(apiBaseUrl, token, courseGroupId);
  const subject = data?.subject;
  const students = data?.students ?? [];

  return (
    <main className="teacher-detail-container">
      <button type="button" className="back-btn" onClick={onBack} aria-label="Volver a materias">
        <span aria-hidden="true">←</span>
      </button>

      {loading && <TeacherDetailStatus text="Cargando nómina..." />}

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
              {subject.subject_code} - {subject.subject_name}
            </h1>
            <dl className="detail-meta-grid">
              <div>
                <dt>Docente</dt>
                <dd>{subject.teacher_name}</dd>
              </div>
              <div>
                <dt>Grupo</dt>
                <dd>{subject.group_code}</dd>
              </div>
              <div>
                <dt>Gestión</dt>
                <dd>{subject.academic_term}</dd>
              </div>
            </dl>
          </header>

          {students.length === 0 ? (
            <TeacherDetailStatus text="Esta materia no tiene estudiantes inscritos." />
          ) : (
            <section className="subject-students-list" aria-label="Nómina de estudiantes">
              <div className="subject-students-row subject-students-head" aria-hidden="true">
                <span>SIS</span>
                <span>CI</span>
                <span>Nombre</span>
              </div>
              {students.map((student) => (
                <article className="subject-students-row" key={`${subject.course_group_id}-${student.sis}`}>
                  <span>{student.sis}</span>
                  <span>{student.ci}</span>
                  <span className="subject-student-name">{student.full_name}</span>
                </article>
              ))}
            </section>
          )}
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
