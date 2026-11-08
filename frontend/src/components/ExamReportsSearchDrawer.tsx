
import { useEffect, useMemo, useState } from 'react';

import { BottomDrawer } from './BottomDrawer';
import { controlPointService } from '../services/controlPointService';
import type { ControlPointExam } from '../types/controlPoint';
import { abbreviateExamType, formatExamType } from '../utils/examFormat';
import { EXAM_STATUS_LABEL, getExamStatus } from '../utils/examStatus';
import type { ControlExamStatus } from '../types/examAccess';
import { normalizeText } from '../utils/searchHelper';

interface ExamReportsSearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exam: ControlPointExam) => void;
}

const EXAM_TYPES = [
  'PRIMER PARCIAL',
  'SEGUNDO PARCIAL',
  'EXAMEN FINAL',
  'SEGUNDA INSTANCIA',
  'EXAMEN DE MESA',
];

function ExamReportsSearchContent({
  onClose,
  onSelect,
}: Pick<ExamReportsSearchDrawerProps, 'onClose' | 'onSelect'>) {
  const [exams, setExams] = useState<ControlPointExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [year, setYear] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    controlPointService.getExamsForReports(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setExams(items);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar los exámenes.',
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const years = useMemo(
    () =>
      [...new Set(exams.map((exam) => exam.date.slice(0, 4)))]
        .filter(Boolean)
        .sort()
        .reverse(),
    [exams],
  );

  const filteredExams = useMemo(() => {
    const query = normalizeText(search);

    return exams.filter((exam) => {
      if (type && exam.exam_type.trim().toUpperCase() !== type) {
        return false;
      }

      if (status && getExamStatus(exam) !== status) {
        return false;
      }

      if (year && !exam.date.startsWith(year)) {
        return false;
      }

      return !query || normalizeText(
        `${exam.subject_name} ${exam.group} ${exam.exam_type}`,
      ).includes(query);
    });
  }, [exams, search, type, status, year]);

  return (
    <div className="cg-drawer">
      <label className="cg-search" htmlFor="er-search-input">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m16 16 5 5" />
        </svg>

        <input
          id="er-search-input"
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
            aria-label="Filtrar por tipo"
          >
            <option value="">Tipo</option>
            {EXAM_TYPES.map((item) => (
              <option key={item} value={item}>
                {formatExamType(item)}
              </option>
            ))}
          </select>
        </label>

        <label className="cg-term-select">
          <span className="cg-visually-hidden">Estado</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="">Estado</option>
            {(Object.keys(EXAM_STATUS_LABEL) as ControlExamStatus[]).map(
              (item) => (
                <option key={item} value={item}>
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
            <option value="">Gestión</option>
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="cg-count">
        <span>Exámenes</span>
        <strong>{filteredExams.length}</strong>
      </div>

      <div className="cg-list" role="list" aria-label="Exámenes">
        {loading && (
          <p className="cg-feedback">Cargando exámenes...</p>
        )}

        {error && (
          <p className="cg-feedback cg-error" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && filteredExams.length === 0 && (
          <p className="cg-feedback">No se encontraron exámenes.</p>
        )}

        {!loading && !error && filteredExams.map((exam) => (
          <button
            type="button"
            role="listitem"
            className="cg-row"
            key={exam.exam_id}
            onClick={() => onSelect(exam)}
          >
            <span className="cg-row-name">{exam.subject_name}</span>
            <span className="cg-chip">G{exam.group}</span>
            <span className="cg-chip">
              {abbreviateExamType(exam.exam_type)}
            </span>
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="m9 5 7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>

      <button type="button" className="cg-cancel" onClick={onClose}>
        Cancelar
      </button>
    </div>
  );
}

export function ExamReportsSearchDrawer({
  isOpen,
  onClose,
  onSelect,
}: ExamReportsSearchDrawerProps) {
  return (
    <BottomDrawer
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Buscar examen para generar reportes"
    >
      <ExamReportsSearchContent
        onClose={onClose}
        onSelect={onSelect}
      />
    </BottomDrawer>
  );
}
