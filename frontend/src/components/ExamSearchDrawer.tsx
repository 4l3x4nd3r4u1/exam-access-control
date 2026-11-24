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
import { controlPointRotationService } from '../services/controlPointRotationService';
import type { ControlPoint } from '../types/controlPointRotation';

interface ExamSearchDrawerProps {
  isOpen: boolean;
  currentUserId: number;
  onClose: () => void;
  onSelect: (
    exam: ControlExam,
    room: ControlExamRoom,
    points: ControlPoint[],
  ) => void;
}

const ALL = '';

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
  currentUserId,
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
  const [selectedExam, setSelectedExam] = useState<ControlExam | null>(null);
  const [controlPoints, setControlPoints] = useState<ControlPoint[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [isSelectingPoint, setIsSelectingPoint] = useState(false);
  const [pointError, setPointError] = useState<string | null>(null);

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

  async function openRoom(exam: ControlExam, room: ControlExamRoom, points: ControlPoint[]) {
    const roomPoints = points.filter(
      (point) => point.room_id === Number(room.room_id),
    );
    const currentPoint = roomPoints.find((point) => point.is_current);
    const initialPoint = currentPoint ?? roomPoints.find(
      (point) => point.control_type === 'ENTRY',
    );

    if (!initialPoint) {
      throw new Error('El aula no tiene un punto de control disponible.');
    }

    if (!currentPoint) {
      await controlPointRotationService.join(exam.exam_id, initialPoint.id);
    }

    onSelect(exam, room, roomPoints.map((point) => ({
      ...point,
      is_current: point.id === initialPoint.id,
    })));
  }

  async function handleExamSelection(exam: ControlExam) {
    if (isSelectingPoint) return;
    setIsSelectingPoint(true);
    setPointError(null);
    setSelectedRoomId(null);

    try {
      const response = await controlPointRotationService.getControlPoints(exam.exam_id);
      const activePoints = response.control_points.filter((point) => point.is_active);

      if (activePoints.length === 0) {
        throw new Error('No existen aulas disponibles.');
      }

      if (response.current_assignment) {
        const currentPoint = activePoints.find(
          (point) => point.id === response.current_assignment?.control_point_id,
        );
        const currentRoom = exam.rooms.find(
          (room) => Number(room.room_id) === currentPoint?.room_id,
        );
        if (!currentPoint || !currentRoom) {
          throw new Error('No se encontró el aula de tu asignación activa.');
        }
        await openRoom(exam, currentRoom, activePoints.map((point) => ({
          ...point,
          is_current: point.id === currentPoint.id,
        })));
        return;
      }

      const assignedRooms = exam.rooms.filter(
        (room) => room.assistant_id !== null && Number(room.assistant_id) === Number(currentUserId),
      );

      if (assignedRooms.length === 1) {
        await openRoom(exam, assignedRooms[0], activePoints);
        return;
      }

      setControlPoints(activePoints);
      setSelectedExam(exam);
    } catch (requestError: unknown) {
      setPointError(requestError instanceof Error ? requestError.message : 'No se pudo iniciar el control del examen.');
    } finally {
      setIsSelectingPoint(false);
    }
  }

  async function handlePointSelection() {
    if (!selectedExam || selectedRoomId === null || isSelectingPoint) return;

    const room = selectedExam.rooms.find(
      (item) => Number(item.room_id) === selectedRoomId,
    );

    if (!room) {
      setPointError('No se encontró el aula seleccionada.');
      return;
    }

    setIsSelectingPoint(true);
    setPointError(null);

    try {
      await openRoom(selectedExam, room, controlPoints);
    } catch (requestError: unknown) {
      setPointError(requestError instanceof Error ? requestError.message : 'No se pudo iniciar el control del aula.');
    } finally {
      setIsSelectingPoint(false);
    }
  }

  function handleBackToExams() {
    setSelectedExam(null);
    setControlPoints([]);
    setSelectedRoomId(null);
    setPointError(null);
  }

  const rows = useMemo(
    () =>
      exams.map((exam) => ({
        exam,
        status: getExamStatus(exam),
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

  const availableRooms = useMemo(
    () =>
      Array.from(
        new Map(
          controlPoints.map((point) => [
            point.room_id,
            {
              id: point.room_id,
              name: point.room_name,
            },
          ]),
        ).values(),
      ),
    [controlPoints],
  );

  if (selectedExam) {
    return (
      <div className="cg-drawer">
        <h2>Seleccionar aula</h2>

        <p>{selectedExam.subject_name}</p>

        <div className="cg-count">
          <span>Aulas disponibles</span>
          <strong>{availableRooms.length}</strong>
        </div>

        <div className="cg-list">
          {availableRooms.map((room) => (
            <label className="cg-row" key={room.id}>
              <input
                type="radio"
                name="control-room"
                checked={selectedRoomId === room.id}
                disabled={isSelectingPoint}
                onChange={() => {
                  setSelectedRoomId(room.id);
                  setPointError(null);
                }}
              />

              <span className="cg-row-name">{room.name}</span>
            </label>
          ))}

          {pointError && (
            <p className="cg-feedback cg-error" role="alert">
              {pointError}
            </p>
          )}
        </div>

        <button
          type="button"
          className="cg-cancel"
          disabled={selectedRoomId === null || isSelectingPoint}
          onClick={handlePointSelection}
        >
          Continuar
        </button>

        <button
          type="button"
          className="cg-cancel"
          disabled={isSelectingPoint}
          onClick={handleBackToExams}
        >
          Volver
        </button>
      </div>
    );
  }

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

        {pointError && (
          <p className="cg-feedback cg-error" role="alert">
            {pointError}
          </p>
        )}

        {!isLoading &&
          !error &&
          visibleRows.map(({ exam, status: examStatus }) => {
            const canOpen = examStatus === 'EN_CURSO';

            return (
              <button
                type="button"
                role="listitem"
                className={`cg-row${canOpen ? '' : ' is-disabled'}`}
                key={exam.exam_id}
                disabled={!canOpen || isSelectingPoint}
                title={
                  canOpen
                    ? undefined
                    : 'Solo se pueden controlar exámenes en curso.'
                }
                onClick={() => void handleExamSelection(exam)}
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
      </div>

      <button type="button" className="cg-cancel" onClick={onClose}>
        Cancelar
      </button>
    </div>
  );
}

export function ExamSearchDrawer({
  isOpen,
  currentUserId,
  onClose,
  onSelect,
}: ExamSearchDrawerProps) {
  return (
    <BottomDrawer
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Buscar examen para control de acceso"
    >
      <ExamSearchContent currentUserId={currentUserId} onClose={onClose} onSelect={onSelect} />
    </BottomDrawer>
  );
}