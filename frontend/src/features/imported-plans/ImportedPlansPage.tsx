import importDocSvg from '../../assets/image 23.svg';
import importedPlansImage from '../../assets/imagen PLAN IMPOR.png';
import { useImportedPlans } from './hooks';
import type { ReactNode } from 'react';
import type { ImportedPlan } from './types';

interface ImportedPlansPageProps {
  apiBaseUrl: string;
  token: string;
  onBack: () => void;
  onSelectPlan: (courseGroupId: string) => void;
}

export function ImportedPlansPage({
  apiBaseUrl,
  token,
  onBack,
  onSelectPlan,
}: ImportedPlansPageProps) {
  const { data, error, loading, retry } = useImportedPlans(apiBaseUrl, token);
  const plans = data?.plans ?? [];
  const total = data?.total ?? 0;

  return (
    <main className="plans-container">
      <button type="button" className="back-btn" onClick={onBack} aria-label="Volver">
        <span aria-hidden="true">←</span>
      </button>

      <header className="plans-hero">
        <img src={importedPlansImage} alt="" className="plans-hero-icon" aria-hidden="true" />
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

      {!loading && !error && plans.length === 0 && (
        <StatusMessage text="No hay planillas importadas." />
      )}

      {!loading && !error && plans.length > 0 && (
        <section className="plans-grid" aria-label="Planillas importadas">
          {plans.map((plan) => (
            <ImportedPlanCard key={plan.course_group_id} plan={plan} onSelect={onSelectPlan} />
          ))}
        </section>
      )}
    </main>
  );
}

function ImportedPlanCard({
  plan,
  onSelect,
}: {
  plan: ImportedPlan;
  onSelect: (courseGroupId: string) => void;
}) {
  return (
    <button
      type="button"
      className="plan-card"
      onClick={() => onSelect(plan.course_group_id)}
      aria-label={`Ver planilla ${plan.subject_code}, grupo ${plan.group_code}`}
    >
      <img src={importDocSvg} alt="" className="plan-card-icon" aria-hidden="true" />
      <span className="plan-card-code">{plan.subject_code}</span>
      <span className="plan-card-name">{plan.subject_name}</span>
      <span className="plan-card-group">Grupo {plan.group_code}</span>
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
