import { useEffect, useState } from 'react';
import { processedRostersService } from '../services/processedRostersService';
import type { ProcessedRoster, RosterStudent } from '../types/processedRoster';

interface ProcessedRosterDetailViewProps {
  roster: ProcessedRoster;
  onBack: () => void;
  onLogout: () => void;
}

export function ProcessedRosterDetailView({ roster, onBack, onLogout }: ProcessedRosterDetailViewProps) {
  const [metadata, setMetadata] = useState<ProcessedRoster>(roster);
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const courseGroupId = roster.course_group_id || roster.courseGroupId;

  useEffect(() => {
    if (!courseGroupId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    processedRostersService.getProcessedRosterDetail(courseGroupId)
      .then((detail) => {
        if (isMounted) {
          if (detail.metadata) setMetadata(detail.metadata);
          if (Array.isArray(detail.students)) setStudents(detail.students);
        }
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el detalle de la planilla.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [courseGroupId]);

  const activeMetadata = metadata || roster;
  const subjectCode = activeMetadata.subject_code || activeMetadata.subjectCode || '';
  const subjectName = activeMetadata.subject_name || activeMetadata.subjectName || '';
  const teacherName = activeMetadata.teacher_name || activeMetadata.teacherName || '';
  const groupCode = activeMetadata.group_code || activeMetadata.groupCode || '';
  const academicTerm = activeMetadata.academic_term || activeMetadata.academicTerm || '';

  return (
    <main className="app-shell processed-roster-detail-screen">
      <header className="processed-roster-detail-topbar">
        <button type="button" className="processed-rosters-back" onClick={onBack} aria-label="Volver a planillas importadas">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12H4M10 6l-6 6 6 6" />
          </svg>
        </button>
        <button type="button" className="processed-rosters-icon-button" onClick={onLogout} aria-label="Cerrar sesión">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4.25" />
            <path d="M4.5 21c.85-4 3.3-6 7.5-6s6.65 2 7.5 6" />
          </svg>
        </button>
      </header>

      <section className="processed-roster-detail-header">
        <h1>{subjectCode} - {subjectName}</h1>
        <dl>
          <div><dt>Docente:</dt><dd>{teacherName}</dd></div>
          <div><dt>Grupo:</dt><dd>{groupCode}</dd></div>
          <div><dt>Gestión:</dt><dd>{academicTerm}</dd></div>
        </dl>
      </section>

      <section className="roster-detail-table" aria-label="Nómina de estudiantes">
        <div className="roster-detail-table-header">
          <span>sis</span><span>ci</span><span>nombre</span>
        </div>
        {isLoading && <p className="processed-rosters-feedback">Cargando estudiantes...</p>}
        {error && <p className="processed-rosters-feedback processed-rosters-error" role="alert">{error}</p>}
        {!isLoading && !error && students.map((student) => (
          <div className="roster-detail-table-row" key={student.studentKey}>
            <span>{student.studentKey}</span>
            <span>{student.ci}</span>
            <span>{student.fullName}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
