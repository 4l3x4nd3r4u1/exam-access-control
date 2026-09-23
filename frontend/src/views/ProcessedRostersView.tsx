import { useEffect, useState } from 'react';
import processedRostersIcon from '../assets/planillas_importadas.svg';
import rosterPreviewIcon from '../assets/planilla_importada.svg';
import { processedRostersService } from '../services/processedRostersService';
import type { ProcessedRoster } from '../types/processedRoster';

interface ProcessedRostersViewProps {
  onBack: () => void;
  onLogout: () => void;
  onSelectRoster: (roster: ProcessedRoster) => void;
}

export function ProcessedRostersView({ onBack, onLogout, onSelectRoster }: ProcessedRostersViewProps) {
  const [rosters, setRosters] = useState<ProcessedRoster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    processedRostersService.getProcessedRosters()
      .then((items) => {
        if (isMounted) setRosters(items);
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar las planillas.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="app-shell processed-rosters-screen">
      <header className="processed-rosters-topbar">
        <button type="button" className="processed-rosters-back" onClick={onBack} aria-label="Volver al panel">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12H4M10 6l-6 6 6 6" />
          </svg>
        </button>
        <div className="processed-rosters-actions">
          <button type="button" className="processed-rosters-icon-button" aria-label="Cambiar apariencia">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3.25" />
              <path d="M12 2v2.25M12 19.75V22M4.93 4.93l1.59 1.59M17.48 17.48l1.59 1.59M2 12h2.25M19.75 12H22M4.93 19.07l1.59-1.59M17.48 6.52l1.59-1.59" />
            </svg>
          </button>
          <button type="button" className="processed-rosters-icon-button" onClick={onLogout} aria-label="Cerrar sesión">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="4.25" />
              <path d="M4.5 21c.85-4 3.3-6 7.5-6s6.65 2 7.5 6" />
            </svg>
          </button>
        </div>
      </header>

      <section className="processed-rosters-hero">
        <img src={processedRostersIcon} alt="" />
        <h1>Planillas importadas</h1>
        <p>{rosters.length} {rosters.length === 1 ? 'documento' : 'documentos'}</p>
      </section>

      {isLoading && <p className="processed-rosters-feedback">Cargando planillas...</p>}
      {error && <p className="processed-rosters-feedback processed-rosters-error" role="alert">{error}</p>}
      {!isLoading && !error && (
        <section className="processed-rosters-grid" aria-label="Planillas importadas">
          {rosters.map((roster) => (
            <button type="button" className="processed-roster-card" key={roster.courseGroupId} onClick={() => onSelectRoster(roster)}>
              <img src={rosterPreviewIcon} alt="" />
              <h2>{roster.subjectName} - G{roster.groupCode}</h2>
            </button>
          ))}
        </section>
      )}
    </main>
  );
}
