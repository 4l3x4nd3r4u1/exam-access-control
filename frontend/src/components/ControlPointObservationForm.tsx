import { useEffect, useRef, useState } from 'react';
import { ControlPointApiError, controlPointService } from '../services/controlPointService';

interface ControlPointObservationFormProps {
  examId: number;
  identifier: string;
  onSavingChange: (saving: boolean) => void;
  onAccessDenied: () => void;
}

export function ControlPointObservationForm({ examId, identifier, onSavingChange, onAccessDenied }: ControlPointObservationFormProps) {
  const [text, setText] = useState('');
  const [savedText, setSavedText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const mounted = useRef(true);
  const inFlight = useRef(false);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const observation = text.trim();
    if (inFlight.current || !observation || observation.length > 5000 || observation === savedText) return;
    inFlight.current = true;
    setSaving(true);
    onSavingChange(true);
    setError(null);
    setNotice(null);
    try {
      const response = await controlPointService.saveObservation({ identifier, exam_id: examId, observation });
      if (!mounted.current) return;
      setSavedText(observation);
      setNotice(response.message || 'Observación registrada correctamente.');
    } catch (requestError: unknown) {
      if (!mounted.current) return;
      if (requestError instanceof ControlPointApiError && [401, 403].includes(requestError.status)) onAccessDenied();
      setError(requestError instanceof ControlPointApiError
        ? requestError.message
        : 'No se pudo confirmar el guardado. Tu texto se conserva para volver a intentarlo.');
    } finally {
      inFlight.current = false;
      if (mounted.current) { setSaving(false); onSavingChange(false); }
    }
  };

  return (
    <form className="cp-observation" onSubmit={(event) => { void save(event); }} aria-label="Registrar información relativa">
      <label className="cp-observation-field" htmlFor="cp-observation-text">
        <span>Información relativa</span>
        <textarea id="cp-observation-text" value={text} maxLength={5000} rows={2} disabled={saving} placeholder="Escribe una observación del estudiante" onChange={(event) => { setText(event.target.value); setNotice(null); setError(null); }} />
      </label>
      <span className="cp-character-count">{text.length}/5000</span>
      {error && <p className="cp-feedback cp-error" role="alert">{error}</p>}
      {notice && <p className="cp-save-notice" role="status">{notice}</p>}
      <button className="cp-primary" type="submit" disabled={saving || !text.trim() || text.trim() === savedText}>{saving ? 'Guardando...' : 'Registrar información relativa'}</button>
    </form>
  );
}
