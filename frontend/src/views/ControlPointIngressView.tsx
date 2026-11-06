import { useEffect, useRef, useState } from 'react';
import { ControlPointIcon } from '../components/ControlPointIcon';
import { ControlPointStudentSearch } from '../components/ControlPointStudentSearch';
import { ControlPointAccessResult } from '../components/ControlPointAccessResult';
import { ControlPointObservationForm } from '../components/ControlPointObservationForm';
import { ControlPointApiError, controlPointService } from '../services/controlPointService';
import { canRecordControlPointObservation, canUseControlPoint, getControlPointStatus } from '../utils/controlPoint';
import { formatExamType } from '../utils/examFormat';
import type { ControlPointSelection, ExamAccessResponse } from '../types/controlPoint';
import type { EnrolledStudent } from '../types/course';
import { ExamAccessControlView } from './ExamAccessControlView';
import '../styles/controlPoints.css';

interface ControlPointIngressViewProps {
  selection: ControlPointSelection;
  userId: number;
  onBack: () => void;
}

export function ControlPointIngressView({ selection, userId, onBack }: ControlPointIngressViewProps) {
  const { exam, room } = selection;
  const [showDuringExam, setShowDuringExam] = useState(false);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<ExamAccessResponse | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savingObservation, setSavingObservation] = useState(false);
  const [blocked, setBlocked] = useState(!canUseControlPoint(room, userId));
  const inFlight = useRef(false);
  const accessRequest = useRef<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const status = getControlPointStatus(exam, now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    controlPointService.getStudents(exam.course_group_id, controller.signal)
      .then((items) => { if (!controller.signal.aborted) setStudents(items); })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar los estudiantes.');
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
      
    return () => controller.abort();
  }, [exam.course_group_id, attempt]);

  useEffect(() => () => accessRequest.current?.abort(), []);

  const changeQuery = (value: string) => { setQuery(value); setResponse(null); setAccessError(null); };

  const checkAccess = async (identifier: string) => {
    const cleanIdentifier = identifier.trim();
    if (inFlight.current || savingObservation || blocked || !canUseControlPoint(room, userId)) return;
    if (!cleanIdentifier || cleanIdentifier.length > 50) {
      setAccessError('Introduce un SIS o CI de hasta 50 caracteres.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setQuery(cleanIdentifier);
    setResponse(null);
    setAccessError(null);
    const controller = new AbortController();
    accessRequest.current = controller;
    try {
      const result = await controlPointService.checkAccess({
        identifier: cleanIdentifier, exam_id: Number(exam.exam_id), room_id: Number(room.room_id),
      }, controller.signal);
      if (!controller.signal.aborted) setResponse(result);
    } catch (requestError: unknown) {
      if (controller.signal.aborted) return;
      if (requestError instanceof ControlPointApiError && (requestError.status === 403 || requestError.status === 401)) setBlocked(true);
      setAccessError(requestError instanceof ControlPointApiError && requestError.status < 500
        ? requestError.message
        : 'No se pudo confirmar el ingreso. Vuelve a validar el mismo SIS o CI para comprobar si quedó registrado.');
    } finally {
      inFlight.current = false;
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  if (showDuringExam) {
  return (
    <ExamAccessControlView
      exam={exam}
      room={room}
      onBack={() => setShowDuringExam(false)}
    />
  );
}
  return (
    <main className="app-shell cp-screen cp-ingress">
      <header className="cp-topbar">
        <button className="cp-icon-button" type="button" disabled={busy || savingObservation} onClick={onBack} aria-label="Volver a puntos de control"><ControlPointIcon name="back" /></button>
        <span className="cp-eyebrow">Control de acceso</span>
        <span className="cp-current-status"><span className={`cp-status-dot cp-status-${status.replaceAll(' ', '-').toLowerCase()}`} />{status}</span>
      </header>
      <section className="cp-exam-heading" aria-label="Punto de control seleccionado">
        <h1>{exam.subject_name}</h1>
        <p><ControlPointIcon name="exam" />{formatExamType(exam.exam_type)} · G{exam.group}</p>
        <p><ControlPointIcon name="room" />{room.room_name}</p>
      </section>
      <div className="cp-tabs" aria-label="Modo de control">
      <span className="cp-tab-active">Ingreso</span>

      <button
        type="button"
        disabled={busy || savingObservation}
        onClick={() => setShowDuringExam(true)}
      >
        Durante el examen
       </button>
      </div>
      <ControlPointStudentSearch
        students={students}
        query={query}
        onQueryChange={changeQuery}
        onSelect={(student) => { changeQuery(student.studentKey || student.ci); }}
        isLoading={isLoading}
        error={error}
        onRetry={() => { setError(null); setIsLoading(true); setAttempt((value) => value + 1); }}
        showSuggestions={!response && !busy}
        busy={busy}
        disabled={savingObservation || blocked}
        onCheck={() => { void checkAccess(query); }}
      />
      {accessError && <p className="cp-feedback cp-error" role="alert">{accessError}</p>}
      {blocked && <p className="cp-feedback cp-error" role="alert">El control está bloqueado para esta sesión. Vuelve al listado para comprobar tu asignación o inicia sesión nuevamente.</p>}
      {response && <ControlPointAccessResult response={response} />}
      {response && !blocked && canRecordControlPointObservation(response, students, room.room_id) && (
        <ControlPointObservationForm examId={Number(exam.exam_id)} identifier={response.data.student?.codigo_sis || query} onSavingChange={setSavingObservation} onAccessDenied={() => setBlocked(true)} />
      )}
    </main>
  );
}
