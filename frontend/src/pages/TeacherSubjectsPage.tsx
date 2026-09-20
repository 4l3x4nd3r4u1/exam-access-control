import importDocSvg from '../assets/image 23.svg';
import { useTeacherSubjects } from '../hooks/useTeacherSubjects';
import type { ReactNode } from 'react';
import type { TeacherSubject } from '../types/teacherSubject';

interface TeacherSubjectsPageProps {
  apiBaseUrl: string;
  token: string;
  teacherId: number;
  teacherName: string;
  onLogout: () => void;
  onSelectSubject: (courseGroupId: string) => void;
}

export function TeacherSubjectsPage({
  apiBaseUrl,
  token,
  teacherId,
  teacherName,
  onLogout,
  onSelectSubject,
}: TeacherSubjectsPageProps) {
  const { data, error, loading, retry } = useTeacherSubjects(apiBaseUrl, token, teacherId);
  const subjects = data?.subjects ?? [];
  const summary = data?.summary;

  return (
    <main className="teacher-container">
      <header className="teacher-header">
        <div className="teacher-title-row">
          <div>
            <h1 className="teacher-title">Materias</h1>
            <p className="teacher-name">{teacherName}</p>
          </div>
          <div className="teacher-actions" aria-label="Accesos rapidos">
            <button type="button" className="teacher-icon-btn" title="Tema" aria-label="Tema">
              <SunIcon />
            </button>
            <button
              type="button"
              className="teacher-icon-btn"
              onClick={onLogout}
              title="Cerrar sesion"
              aria-label="Cerrar sesion"
            >
              <UserIcon />
            </button>
          </div>
        </div>

        <section className="teacher-summary" aria-label="Resumen de materias">
          <MetricItem value={summary?.studentsCount ?? 0} label="estudiantes" />
          <MetricItem value={summary?.subjectsCount ?? 0} label="asignadas" />
          <MetricItem value={summary?.academicPeriod ?? '-'} label="" />
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
              key={subject.courseGroupId}
              subject={subject}
              onSelect={onSelectSubject}
            />
          ))}
        </section>
      )}
    </main>
  );
}

function MetricItem({
  value,
  label,
}: {
  value: number | string;
  label: string;
}) {
  return (
    <div className="teacher-metric-item">
      <strong>{value}</strong>
      {label && <span>{label}</span>}
    </div>
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
      onClick={() => onSelect(subject.courseGroupId)}
      aria-label={`Ver materia ${subject.subjectName}, grupo ${subject.groupCode}`}
    >
      <span className="subject-icon-wrap">
        <img src={importDocSvg} alt="" className="subject-icon" aria-hidden="true" />
      </span>

      <span className="subject-card-content">
        <span className="subject-title-row">
          <span className="subject-title">{subject.subjectName}</span>
          <span className="subject-nav-circle" aria-hidden="true">{'>'}</span>
        </span>

        <span className="subject-code-row">
          <span>{subject.subjectCode}</span>
          <span>Grupo {subject.groupCode}</span>
        </span>

        <span className="subject-meta">
          <span className="subject-meta-pill subject-enrolled-pill">
            <span className="subject-dot" aria-hidden="true" />
            {subject.enrolledCount} inscritos
          </span>
          <span className="subject-meta-pill">
            <CalendarIcon />
            {subject.academicTerm}
          </span>
        </span>
      </span>
    </button>
  );
}

function CalendarIcon() {
  return (
    <svg className="calendar-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M4 21c1.8-4 4.5-6 8-6s6.2 2 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
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
