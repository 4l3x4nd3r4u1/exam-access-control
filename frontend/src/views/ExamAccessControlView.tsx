import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

import { ConfirmModal } from '../components/ConfirmModal';
import { courseService } from '../services/courseService';
import { examAccessService } from '../services/examAccessService';
import {
  abbreviateExamType,
  formatCheckInTime,
  formatExamType,
} from '../utils/examFormat';
import { EXAM_STATUS_LABEL, getExamStatus } from '../utils/examStatus';
import { normalizeText } from '../utils/searchHelper';
import type { EnrolledStudent } from '../types/course';
import type {
  AccessStudent,
  ControlExam,
  ControlExamRoom,
  DuringExamResponse,
  EntryCheckResponse,
  ExpulsionHistoryItem,
} from '../types/examAccess';

interface ExamAccessControlViewProps {
  exam: ControlExam;
  /** Aula del usuario autenticado (punto de control). */
  room: ControlExamRoom;
  onBack: () => void;
}

type AccessTab = 'ENTRY' | 'DURING';
type Tone = 'green' | 'orange' | 'amber' | 'red' | 'gray';

type Outcome =
  | { kind: 'ENTRY'; payload: EntryCheckResponse['data'] }
  | { kind: 'DURING'; payload: DuringExamResponse['data'] }
  | { kind: 'MESSAGE'; text: string };

const EXCEPTIONAL_NOTE_DEFAULT =
  'Estudiante inhabilitado ingresa al examen bajo autorización';

const MAX_SUGGESTIONS = 8;

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function HistoryList({ items }: { items: ExpulsionHistoryItem[] }) {
  return (
    <section className="ec-history" aria-label="Expulsiones">
      <h3>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <path d="m6 6 12 12" />
        </svg>
        Expulsiones
      </h3>

      {items.length === 0 ? (
        <p className="ec-history-empty">Sin expulsiones registradas.</p>
      ) : (
        <ul>
          {items.map((item, index) => (
            <li key={`${item.exam_id}-${index}`}>
              <div>
                <span className="ec-history-subject">{item.subject_name}</span>
                <span className="ec-history-reason">
                  {item.reason || 'Sin motivo registrado'}
                </span>
              </div>
              <span className="cg-chip">G{item.group}</span>
              <span className="cg-chip">
                {abbreviateExamType(item.exam_type)}
              </span>
              <span className="cg-chip">{item.academic_term}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface ResultCardProps {
  tone: Tone;
  title: string;
  detail?: ReactNode;
  extra?: ReactNode;
  history?: ExpulsionHistoryItem[];
}

function ResultCard({ tone, title, detail, extra, history }: ResultCardProps) {
  return (
    <section className="ec-result" aria-live="polite">
      <div className="ec-result-head">
        <span className={`ec-dot is-${tone}`} aria-hidden="true" />
        <h2>{title}</h2>
      </div>

      {detail && <div className="ec-result-detail">{detail}</div>}
      {extra}
      {history && <HistoryList items={history} />}
    </section>
  );
}

function StudentLine({ student }: { student: AccessStudent | null }) {
  if (!student) return null;

  return (
    <p className="ec-student-line">
      {student.full_name} · {student.codigo_sis}
    </p>
  );
}

export function ExamAccessControlView({
  exam,
  room,
  onBack,
}: ExamAccessControlViewProps) {
  const [tab, setTab] = useState<AccessTab>('ENTRY');
  const [query, setQuery] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState<
    { tone: 'ok' | 'error'; text: string } | null
  >(null);

  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  
  const [isConfirmingExpulsion, setIsConfirmingExpulsion] = useState(false);
  
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Descarta respuestas de búsquedas anteriores si ya se lanzó otra.
  const requestId = useRef(0);

  const examStatus = getExamStatus(exam);

  // Lista de estudiantes del grupo: solo sirve para sugerir mientras se escribe.
  useEffect(() => {
    let isMounted = true;

    courseService
      .getEnrolledStudents(exam.course_group_id)
      .then((items) => {
        if (isMounted) setStudents(items);
      })
      .catch(() => {
        /* Sin sugerencias: se puede buscar igual escribiendo SIS o CI completo. */
      });

    return () => {
      isMounted = false;
    };
  }, [exam.course_group_id]);

  const suggestions = useMemo(() => {
    const text = normalizeText(query);
    if (!showSuggestions || text.length < 2) return [];

    return students
      .filter((student) =>
        normalizeText(
          `${student.fullName} ${student.studentKey} ${student.ci}`,
        ).includes(text),
      )
      .slice(0, MAX_SUGGESTIONS);
  }, [students, query, showSuggestions]);

  const resetResult = () => {
    requestId.current += 1;
    setOutcome(null);
    setFeedback(null);
    setNote('');
    setReason('');
    setIsBusy(false);
  };

  const changeTab = (next: AccessTab) => {
    if (next === tab) return;
    setTab(next);
    setShowSuggestions(false);
    resetResult();
  };

  /** Ejecuta la consulta de la pestaña activa para un identificador. */
  const runSearch = async (
    identifier: string,
    activeTab: AccessTab = tab,
    keepFeedback = false,
  ) => {
    const trimmed = identifier.trim();
    if (!trimmed) return;

    const currentRequest = ++requestId.current;

    setIsBusy(true);
    setOutcome(null);
    if (!keepFeedback) setFeedback(null);

    try {
      if (activeTab === 'ENTRY') {
        const response = await examAccessService.checkEntry(
          trimmed,
          exam.exam_id,
          room.room_id,
        );
        if (currentRequest !== requestId.current) return;

        setNote(
          response.data.access.result === 'INHABILITADO'
            ? EXCEPTIONAL_NOTE_DEFAULT
            : '',
        );
        setOutcome({ kind: 'ENTRY', payload: response.data });
      } else {
        const response = await examAccessService.checkDuringExam(
          trimmed,
          exam.exam_id,
        );
        if (currentRequest !== requestId.current) return;

        setReason('');
        setOutcome({ kind: 'DURING', payload: response.data });
      }
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      setOutcome({
        kind: 'MESSAGE',
        text: errorText(error, 'No se pudo completar la consulta.'),
      });
    } finally {
      if (currentRequest === requestId.current) setIsBusy(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setShowSuggestions(false);
    void runSearch(query);
  };

  const handleSelectSuggestion = (student: EnrolledStudent) => {
    setQuery(student.studentKey);
    setShowSuggestions(false);
    void runSearch(student.studentKey);
  };

  /** Identificador confiable del estudiante en pantalla (SIS devuelto por la API). */
  const activeIdentifier =
    outcome && outcome.kind !== 'MESSAGE' && outcome.payload.student
      ? outcome.payload.student.codigo_sis
      : query;

  const registerObservation = async () => {
    if (!note.trim()) return;

    setIsBusy(true);
    setFeedback(null);

    try {
      await examAccessService.registerObservation(
        activeIdentifier,
        exam.exam_id,
        note,
      );
      setNote('');
      setFeedback({ tone: 'ok', text: 'Información relativa registrada.' });
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: errorText(error, 'No se pudo registrar la información.'),
      });
    } finally {
      setIsBusy(false);
    }
  };

  const authorizeExceptionalEntry = async () => {
    if (!note.trim()) return;

    setIsBusy(true);
    setFeedback(null);

    try {
      await examAccessService.registerExceptionalEntry(
        activeIdentifier,
        exam.exam_id,
        note,
      );
      setFeedback({ tone: 'ok', text: 'Ingreso excepcional registrado.' });
      // Vuelve a consultar: ahora figura como "Ya registró ingreso".
      await runSearch(activeIdentifier, 'ENTRY', true);
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: errorText(error, 'No se pudo registrar el ingreso excepcional.'),
      });
      setIsBusy(false);
    }
  };

  const expelStudent = async () => {
    setIsConfirmingExpulsion(false);
    setIsBusy(true);
    setFeedback(null);

    try {
      await examAccessService.registerExpulsion(
        activeIdentifier,
        exam.exam_id,
        reason,
      );
      setFeedback({ tone: 'ok', text: 'Expulsión registrada.' });
      await runSearch(activeIdentifier, 'DURING', true);
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: errorText(error, 'No se pudo registrar la expulsión.'),
      });
      setIsBusy(false);
    }
  };

  // ── Render de resultados ──────────────────────────────────────────────
  const renderEntry = (data: EntryCheckResponse['data']) => {
    const { access, student, expulsion_history: history } = data;
    const entryRoom = access.assigned_room_name ?? '-';

    switch (access.result) {
      case 'HABILITADO':
        return (
          <>
            <StudentLine student={student} />
            <ResultCard
              tone="green"
              title="HABILITADO"
              detail={
                <>
                  <p>Ingreso registrado automáticamente</p>
                  {access.norma_particular && (
                    <p className="ec-rule">
                      Norma particular: {access.norma_particular}
                    </p>
                  )}
                </>
              }
              history={history}
            />
            <NoteForm
              label="información relativa"
              value={note}
              onChange={setNote}
              buttonLabel="Registrar información relativa"
              disabled={isBusy || !note.trim()}
              onSubmit={registerObservation}
            />
          </>
        );

      case 'YA REGISTRÓ INGRESO':
        return (
          <>
            <StudentLine student={student} />
            <ResultCard
              tone="orange"
              title="YA REGISTRÓ INGRESO"
              detail={
                <p>
                  Ingresó a las {formatCheckInTime(access.check_in_time)} a{' '}
                  {entryRoom}
                </p>
              }
              history={history}
            />
          </>
        );

      case 'INHABILITADO':
        return (
          <>
            <StudentLine student={student} />
            <ResultCard
              tone="red"
              title="INHABILITADO"
              detail={
                <p>
                  {access.ineligibility_reason ||
                    'El estudiante está inhabilitado.'}
                </p>
              }
              history={history}
            />
            <NoteForm
              label="información relativa"
              value={note}
              onChange={setNote}
              buttonLabel="Autorizar ingreso excepcional"
              disabled={isBusy || !note.trim()}
              onSubmit={authorizeExceptionalEntry}
            />
          </>
        );

      case 'AULA INCORRECTA':
        return (
          <>
            <StudentLine student={student} />
            <ResultCard
              tone="amber"
              title="AULA INCORRECTA"
              detail={
                <p className="ec-room-hint">
                  Aula asignada: <u>{entryRoom}</u>
                </p>
              }
              history={history}
            />
          </>
        );

      case 'NO FIGURA EN EL EXAMEN':
      case 'ESTUDIANTE NO ENCONTRADO':
        return (
          <>
            <StudentLine student={student} />
            <ResultCard
              tone="gray"
              title="SIN OCURRENCIAS"
              detail={
          <p>
            {access.result === 'ESTUDIANTE NO ENCONTRADO'
              ? 'Estudiante no encontrado'
              : 'No figura en el examen'}
          </p>}
              history={history}
            />
          </>
        );
    }
  };

  const renderDuring = (data: DuringExamResponse['data']) => {
    const { exam_student: state, student, expulsion_history: history } = data;
    const entryLine = `Ingreso registrado aula ${
      state.assigned_room_name ?? '-'
    } · ${formatCheckInTime(state.check_in_time)}`;

    switch (state.result) {
      case 'PRESENTE':
      case 'INGRESO EXCEPCIONAL':
        return (
          <>
            <StudentLine student={student} />
            <ResultCard
              tone="green"
              title={state.result}
              detail={
                <>
                  <p>{entryLine}</p>

                    {state.result === 'INGRESO EXCEPCIONAL' && (
                    <p className="ec-rule">
                      Ingreso excepcional autorizado
                    </p>
                  )}
                  {state.observations && (
                    <p className="ec-rule">Observación: {state.observations}</p>
                  )}
                </>
              }
              history={history}
            />
            <NoteForm
              label="motivo"
              value={reason}
              onChange={setReason}
              buttonLabel="Expulsar estudiante"
              disabled={isBusy || !reason.trim()}
              danger
              onSubmit={() => setIsConfirmingExpulsion(true)}
            />
          </>
        );

      case 'EXPULSADO':
        return (
          <>
            <StudentLine student={student} />
            <ResultCard
              tone="red"
              title="EXPULSADO"
              detail={
                <p>{state.expulsion_reason || 'Sin motivo registrado'}</p>
              }
              history={history}
            />
          </>
        );

      case 'AUSENTE':
        return (
          <>
            <StudentLine student={student} />
            <ResultCard
              tone="gray"
              title="AUSENTE"
              detail={<p>Aún no registró su ingreso</p>}
              history={history}
            />
          </>
        );

      case 'NO FIGURA EN EL EXAMEN':
      default:
        return (
          <>
            <StudentLine student={student} />
            <ResultCard
              tone="gray"
              title="SIN OCURRENCIAS"
              detail={<p>No figura en el examen</p>}
              history={history}
            />
          </>
        );
    }
  };

  return (
    <main className="app-shell ec-screen">
      <header className="ec-topbar">
        <button
          type="button"
          className="cg-icon-button"
          onClick={onBack}
          aria-label="Volver al panel"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12H4M10 6l-6 6 6 6" />
          </svg>
        </button>

        <span className="ec-topbar-title">CONTROL DE ACCESO</span>

        <span className={`ec-live is-${examStatus.toLowerCase()}`}>
          {EXAM_STATUS_LABEL[examStatus]}
        </span>
      </header>

      <section className="ec-exam-info">
        <h1>{exam.subject_name}</h1>
        <p>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m3 9 9-5 9 5-9 5-9-5Z" />
            <path d="M7 11.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5" />
          </svg>
          {formatExamType(exam.exam_type)} · G{exam.group}
        </p>
        <p>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
            <circle cx="12" cy="10" r="2.3" />
          </svg>
          {room.room_name}
        </p>
      </section>

      <div className="ec-tabs" role="tablist" aria-label="Tipo de control">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'ENTRY'}
          className={tab === 'ENTRY' ? 'is-active' : ''}
          onClick={() => changeTab('ENTRY')}
        >
          Ingreso
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'DURING'}
          className={tab === 'DURING' ? 'is-active' : ''}
          onClick={() => changeTab('DURING')}
        >
          Durante el examen
        </button>
      </div>

      <form className="ec-search-box" onSubmit={handleSubmit}>
        <label className="ec-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m16 16 5 5" />
          </svg>

          <input
            type="search"
            inputMode="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setShowSuggestions(true);
              if (outcome || feedback) resetResult();
            }}
            placeholder="Código SIS o CI"
            aria-label="Código SIS o CI del estudiante"
            autoComplete="off"
          />

          <button type="submit" disabled={isBusy || !query.trim()}>
            Buscar
          </button>
        </label>

        {suggestions.length > 0 && (
          <ul className="ec-suggestions" role="listbox">
            {suggestions.map((student) => (
              <li key={student.userId}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => handleSelectSuggestion(student)}
                >
                  <span>{student.fullName}</span>
                  <span>{student.studentKey}</span>
                  <span>{student.ci}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      {isBusy && !outcome && <p className="cg-feedback">Consultando...</p>}

      {outcome?.kind === 'MESSAGE' && (
        <p className="ec-message" role="alert">
          {outcome.text}
        </p>
      )}
      {outcome?.kind === 'ENTRY' && renderEntry(outcome.payload)}
      {outcome?.kind === 'DURING' && renderDuring(outcome.payload)}

      {feedback && (
        <p
          className={`ec-feedback is-${feedback.tone}`}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          {feedback.text}
        </p>
      )}

      <ConfirmModal
        isOpen={isConfirmingExpulsion}
        title="Expulsar estudiante"
        message={`¿Confirmas la expulsión de ${
          outcome && outcome.kind === 'DURING'
            ? outcome.payload.student.full_name
            : 'este estudiante'
        }? Quedará registrada en su historial.`}
        confirmLabel="Expulsar"
        isDangerous
        isLoading={isBusy}
        onConfirm={() => void expelStudent()}
        onCancel={() => setIsConfirmingExpulsion(false)}
      />
    </main>
  );
}

interface NoteFormProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  buttonLabel: string;
  disabled: boolean;
  danger?: boolean;
  onSubmit: () => void;
}

function NoteForm({
  label,
  value,
  onChange,
  buttonLabel,
  disabled,
  danger = false,
  onSubmit,
}: NoteFormProps) {
  return (
    <div className="ec-action">
      <label className="ec-note">
        <span>{label}</span>
        <textarea
          value={value}
          rows={2}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>

      <button
        type="button"
        className={`ec-action-button${danger ? ' is-danger' : ''}`}
        disabled={disabled}
        onClick={onSubmit}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
