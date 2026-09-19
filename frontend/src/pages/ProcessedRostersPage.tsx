import type { ReactNode } from 'react';
import importDocSvg from '../assets/image 23.svg';
import { useProcessedRosters } from '../hooks/useProcessedRosters';
import type { ProcessedRoster } from '../types/processedRoster';

interface ProcessedRostersPageProps {
  apiBaseUrl: string;
  token: string;
  onBack: () => void;
  onSelectRoster: (courseGroupId: string) => void;
}

export function ProcessedRostersPage({
  apiBaseUrl,
  token,
  onBack,
  onSelectRoster,
}: ProcessedRostersPageProps) {
  const { data, error, loading, retry } = useProcessedRosters(apiBaseUrl, token);
  const rosters = data?.rosters ?? [];
  const total = data?.total ?? 0;

  return (
    <main className="plans-container">
      <button type="button" className="back-btn" onClick={onBack} aria-label="Volver">
        <span aria-hidden="true">{'<'}</span>
      </button>

      <header className="plans-hero">
        <img src={importDocSvg} alt="" className="plans-hero-icon" aria-hidden="true" />
        <h1 className="plans-title">Planillas importadas</h1>
        <p className="plans-count" aria-live="polite">
          {total} {total === 1 ? 'documento' : 'documentos'}
        </p>
      </header>

      {loading && <StatusMessage text="Cargando planillas..." />}

      {!loading && error && (
        <StatusMessage text={error}>
          <button type="button" className="btn-secondary compact-btn" onClick={() => retry()}>
            Reintentar
          </button>
        </StatusMessage>
      )}

      {!loading && !error && rosters.length === 0 && (
        <StatusMessage text="No hay planillas importadas." />
      )}

      {!loading && !error && rosters.length > 0 && (
        <section className="plans-grid" aria-label="Planillas importadas">
          {rosters.map((roster) => (
            <ProcessedRosterCard
              key={roster.courseGroupId}
              roster={roster}
              onSelect={onSelectRoster}
            />
          ))}
        </section>
      )}
    </main>
  );
}

function ProcessedRosterCard({
  roster,
  onSelect,
}: {
  roster: ProcessedRoster;
  onSelect: (courseGroupId: string) => void;
}) {
  return (
    <button
      type="button"
      className="plan-card"
      onClick={() => onSelect(roster.courseGroupId)}
      aria-label={`Ver planilla ${roster.subjectCode}, grupo ${roster.groupCode}`}
    >
      <img src={importDocSvg} alt="" className="plan-card-icon" aria-hidden="true" />
      <span className="plan-card-code">{roster.subjectCode}</span>
      <span className="plan-card-name">{roster.subjectName}</span>
      <span className="plan-card-group">Grupo {roster.groupCode}</span>
    </button>
  );
}

function StatusMessage({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <section className="plans-status" role="status" aria-live="polite">
      <p>{text}</p>
      {children}
    </section>
  );
}
