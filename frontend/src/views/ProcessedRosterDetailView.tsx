import { useEffect, useState } from 'react';
import { processedRostersService } from '../services/processedRostersService';
import type { ProcessedRoster, RosterStudent } from '../types/processedRoster';

interface ProcessedRosterDetailViewProps {
  roster: ProcessedRoster;
  onBack: () => void;
  onLogout: () => void;
}

export function ProcessedRosterDetailView({ roster, onBack, onLogout }: ProcessedRosterDetailViewProps) {
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    processedRostersService.getRosterStudents(roster.courseGroupId)
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
  }, [roster.courseGroupId]);

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
        <h1>{roster.subjectCode} - {roster.subjectName}</h1>
        <dl>
          <div><dt>Docente:</dt><dd>{roster.teacherName ?? 'Sin asignar'}</dd></div>
          <div><dt>Grupo:</dt><dd>{roster.groupCode}</dd></div>
          <div><dt>Gestión:</dt><dd>{roster.academicTerm}</dd></div>
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
            <span>{student.studentKey}</span><span>{student.ci}</span><span>{student.fullName}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
