import { useEffect, useMemo, useState } from 'react';

import { BottomDrawer } from './BottomDrawer';
import { examAccessService } from '../services/examAccessService';
import { abbreviateExamType, formatExamType } from '../utils/examFormat';
import { EXAM_STATUS_LABEL, getExamStatus } from '../utils/examStatus';
import { normalizeText } from '../utils/searchHelper';
import type {
  ControlExam,
  ControlExamRoom,
  ControlExamStatus,
} from '../types/examAccess';

interface ExamSearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Examen elegido y el aula del usuario que actúa como punto de control. */
  onSelect: (exam: ControlExam, room: ControlExamRoom) => void;
}

const ALL = '';

/** Tipos de examen del filtro, en el orden de tipo.png. */
const EXAM_TYPE_OPTIONS = [
  'PRIMER PARCIAL',
  'SEGUNDO PARCIAL',
  'EXAMEN FINAL',
  'SEGUNDA INSTANCIA',
  'EXAMEN DE MESA',
];

function StatusIcon({ status }: { status: ControlExamStatus }) {
  return (
    <svg
      className={`ec-status-icon is-${status.toLowerCase()}`}
      viewBox="0 0 24 24"
      role="img"
      aria-label={EXAM_STATUS_LABEL[status]}
    >
      <circle cx="12" cy="12" r="9" />
      {status === 'EN_CURSO' && <path d="m10 8.5 5 3.5-5 3.5Z" />}
      {status === 'PROXIMAMENTE' && <path d="M12 7v5l3 2" />}
      {status === 'FINALIZADO' && <path d="m8 12.5 3 3 5-6" />}
    </svg>
  );
}

function ExamSearchContent({
  onClose,
  onSelect,
}: Omit<ExamSearchDrawerProps, 'isOpen'>) {
  const [exams, setExams] = useState<ControlExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [type, setType] = useState(ALL);
  const [status, setStatus] = useState<ControlExamStatus | typeof ALL>(ALL);
  const [year, setYear] = useState(ALL);

  useEffect(() => {
    let isMounted = true;

    examAccessService
      .getExams()
      .then((items) => {
        if (isMounted) setExams(items);
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'No se pudo cargar la lista de exámenes.',
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const rows = useMemo(
    () =>
      exams.map((exam) => ({
        exam,
        status: getExamStatus(exam),
        room: exam.rooms.find((item) => item.can_interact) ?? null,
      })),
    [exams],
  );

  const years = useMemo(
    () =>
      [...new Set(exams.map((exam) => exam.date.slice(0, 4)))]
        .filter(Boolean)
        .sort()
        .reverse(),
    [exams],
  );

  const visibleRows = useMemo(() => {
    const query = normalizeText(search);

    return rows.filter((row) => {
      if (
        type !== ALL &&
        row.exam.exam_type.trim().toUpperCase() !== type
      ) {
        return false;
      }
      if (status !== ALL && row.status !== status) return false;
      if (year !== ALL && !row.exam.date.startsWith(year)) return false;
      if (!query) return true;

      return normalizeText(
        `${row.exam.subject_name} ${row.exam.group} ${row.exam.exam_type}`,
      ).includes(query);
    });
  }, [rows, search, type, status, year]);

  return (
    <div className="cg-drawer">
      <label className="cg-search" htmlFor="ec-search-input">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m16 16 5 5" />
        </svg>

        <input
          id="ec-search-input"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar Materia"
          autoComplete="off"
        />

        {search && (
          <button type="button" onClick={() => setSearch('')}>
            limpiar
          </button>
        )}
      </label>

      <div className="cg-filters ec-filters">
        <label className="cg-term-select">
          <span className="cg-visually-hidden">Tipo</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            aria-label="Filtrar por tipo de examen"
          >
            <option value={ALL}>Tipo</option>
            {EXAM_TYPE_OPTIONS.map((item) => (
              <option value={item} key={item}>
                {formatExamType(item)}
              </option>
            ))}
          </select>
        </label>

        <label className="cg-term-select">
          <span className="cg-visually-hidden">Estado</span>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as ControlExamStatus | typeof ALL)
            }
            aria-label="Filtrar por estado"
          >
            <option value={ALL}>Estado</option>
            {(Object.keys(EXAM_STATUS_LABEL) as ControlExamStatus[]).map(
              (item) => (
                <option value={item} key={item}>
                  {EXAM_STATUS_LABEL[item]}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="cg-term-select">
          <span className="cg-visually-hidden">Gestión</span>
          <select
            value={year}
            onChange={(event) => setYear(event.target.value)}
            aria-label="Filtrar por gestión"
          >
            <option value={ALL}>Gestión</option>
            {years.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="cg-count">
        <span>Exámenes</span>
        <strong>{visibleRows.length}</strong>
      </div>

      <div className="cg-list" role="list" aria-label="Exámenes">
        {isLoading && <p className="cg-feedback">Cargando exámenes...</p>}

        {error && (
          <p className="cg-feedback cg-error" role="alert">
            {error}
          </p>
        )}

        {!isLoading &&
          !error &&
          visibleRows.map(({ exam, status: examStatus, room }) => {
            // Solo se puede controlar un examen en curso con un aula propia.
            const canOpen = examStatus === 'EN_CURSO' && room !== null;

            return (
              <button
                type="button"
                role="listitem"
                className={`cg-row${canOpen ? '' : ' is-disabled'}`}
                key={exam.exam_id}
                disabled={!canOpen}
                title={
                  canOpen
                    ? undefined
                    : room === null
                      ? 'No tienes un aula asignada en este examen.'
                      : 'Solo se pueden controlar exámenes en curso.'
                }
                onClick={() => room && onSelect(exam, room)}
              >
                <span className="cg-row-name">{exam.subject_name}</span>
                <span className="cg-chip">G{exam.group}</span>
                <span className="cg-chip">
                  {abbreviateExamType(exam.exam_type)}
                </span>
                <StatusIcon status={examStatus} />
              </button>
            );
          })}

        {!isLoading && !error && visibleRows.length === 0 && (
          <p className="cg-feedback">No se encontraron exámenes.</p>
        )}
      </div>

      <button type="button" className="cg-cancel" onClick={onClose}>
        Cancelar
      </button>
    </div>
  );
}

export function ExamSearchDrawer({
  isOpen,
  onClose,
  onSelect,
}: ExamSearchDrawerProps) {
  return (
    <BottomDrawer
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Buscar examen para control de acceso"
    >
      {/* Se monta solo con el drawer abierto: cada apertura empieza limpia. */}
      <ExamSearchContent onClose={onClose} onSelect={onSelect} />
    </BottomDrawer>
  );
}
