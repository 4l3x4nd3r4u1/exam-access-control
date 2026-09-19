import importDocSvg from '../../assets/image 23.svg';
import { useTeacherSubjects } from './hooks';
import type { ReactNode } from 'react';
import type { TeacherSubject } from './types';

interface TeacherSubjectsPageProps {
  apiBaseUrl: string;
  token: string;
  teacherName: string;
  onLogout: () => void;
  onSelectSubject: (courseGroupId: string) => void;
}

export function TeacherSubjectsPage({
  apiBaseUrl,
  token,
  teacherName,
  onLogout,
  onSelectSubject,
}: TeacherSubjectsPageProps) {
  const { data, error, loading, retry } = useTeacherSubjects(apiBaseUrl, token);
  const subjects = data?.subjects ?? [];
  const summary = data?.summary;

  return (
    <main className="teacher-container">
      <header className="teacher-header">
        <div className="teacher-top-row">
          <div>
            <h1 className="teacher-title">Materias</h1>
            <p className="teacher-name">{teacherName}</p>
          </div>
          <button
            type="button"
            className="header-icon-btn"
            onClick={onLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>

        <section className="teacher-summary" aria-label="Resumen de materias">
          <div>
            <strong>{summary?.students_count ?? 0}</strong>
            <span>estudiantes</span>
          </div>
          <div>
            <strong>{summary?.subjects_count ?? 0}</strong>
            <span>asignadas</span>
          </div>
          <div>
            <strong>{summary?.academic_period ?? '-'}</strong>
            <span>gestión</span>
          </div>
        </section>
      </header>

      {loading && <TeacherStatus text="Cargando materias..." />}

      {!loading && error && (
        <TeacherStatus text={error}>
          <button type="button" className="btn-secondary compact-btn" onClick={() => retry()}>
            Reintentar
          </button>
        </TeacherStatus>
      )}

      {!loading && !error && subjects.length === 0 && (
        <TeacherStatus text="No tienes materias asignadas actualmente." />
      )}

      {!loading && !error && subjects.length > 0 && (
        <section className="teacher-subject-list" aria-label="Materias asignadas">
          {subjects.map((subject) => (
            <TeacherSubjectCard
              key={subject.course_group_id}
              subject={subject}
              onSelect={onSelectSubject}
            />
          ))}
        </section>
      )}
    </main>
  );
}

function TeacherSubjectCard({
  subject,
  onSelect,
}: {
  subject: TeacherSubject;
  onSelect: (courseGroupId: string) => void;
}) {
  return (
    <button
      type="button"
      className="teacher-subject-card"
      onClick={() => onSelect(subject.course_group_id)}
      aria-label={`Ver materia ${subject.subject_name}, grupo ${subject.group_code}`}
    >
      <span className="subject-icon-wrap">
        <img src={importDocSvg} alt="" className="subject-icon" aria-hidden="true" />
      </span>
      <span className="subject-card-content">
        <span className="subject-main-line">
          <span className="subject-title">{subject.subject_name}</span>
          <span className="subject-arrow" aria-hidden="true">›</span>
        </span>
        <span className="subject-code">{subject.subject_code}</span>
        <span className="subject-meta">
          <span>Grupo {subject.group_code}</span>
          <span>{subject.enrolled_count} inscritos</span>
          <span>{subject.academic_term}</span>
        </span>
      </span>
    </button>
  );
}

function TeacherStatus({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <section className="teacher-status" role="status" aria-live="polite">
      <p>{text}</p>
      {children}
    </section>
  );
}
