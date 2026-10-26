import { useEffect, useState } from 'react';
import { ControlPointIcon } from '../components/ControlPointIcon';
import { ControlPointFilter } from '../components/ControlPointFilter';
import { controlPointService } from '../services/controlPointService';
import { abbreviateExamType, canUseControlPoint, filterControlPointExams, getControlPointStatus } from '../utils/controlPoint';
import { formatExamType } from '../utils/examFormat';
import type { ControlPointExam, ControlPointSelection } from '../types/controlPoint';
import type { CourseGroup } from '../types/course';
import type { CatalogItem } from '../services/catalogService';
import '../styles/controlPoints.css';

interface ControlPointsViewProps {
  userId: number;
  onBack: () => void;
  onSelect: (selection: ControlPointSelection) => void;
}

export function ControlPointsView({ userId, onBack, onSelect }: ControlPointsViewProps) {
  const [exams, setExams] = useState<ControlPointExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [groups, setGroups] = useState<CourseGroup[]>([]);
  const [examTypes, setExamTypes] = useState<CatalogItem[]>([]);
  const [termWarning, setTermWarning] = useState(false);
  const [filters, setFilters] = useState({ search: '', type: '', status: '', term: '' });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([
      controlPointService.getExams(controller.signal),
      controlPointService.getCourseGroups(controller.signal),
      controlPointService.getExamTypes(controller.signal),
    ])
      .then(([examResult, groupResult, typeResult]) => {
        if (controller.signal.aborted) return;
        if (examResult.status === 'rejected') throw examResult.reason;
        setExams(examResult.value);
        setGroups(groupResult.status === 'fulfilled' ? groupResult.value : []);
        setExamTypes(typeResult.status === 'fulfilled' ? typeResult.value : []);
        setTermWarning(groupResult.status === 'rejected');
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar los puntos de control.');
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  const retry = () => { setError(null); setIsLoading(true); setAttempt((value) => value + 1); };
  const terms = new Map(groups.map((group) => [String(group.course_group_id), group.academic_term]));
  const availableTerms = [...new Set(exams.map((exam) => terms.get(exam.course_group_id)).filter((term): term is string => Boolean(term)))].sort().reverse();
  const catalogTypes = [...examTypes].sort((a, b) => Number(a.value) - Number(b.value));
  const availableTypes = [...new Set([...catalogTypes.map((type) => type.label), ...exams.map((exam) => exam.exam_type)]
    .map((type) => type.toUpperCase().trim()))];
  const visibleExams = filterControlPointExams(exams, filters, terms, now);
  const resetFilters = () => setFilters({ search: '', type: '', status: '', term: '' });

  return (
    <main className="app-shell cp-screen cp-picker">
      <header className="cp-topbar">
        <button className="cp-icon-button" type="button" onClick={onBack} aria-label="Volver al panel"><ControlPointIcon name="back" /></button>
        <h1>Puntos de control</h1>
      </header>
      <label className="cp-search" htmlFor="cp-subject-search">
        <ControlPointIcon name="search" />
        <input id="cp-subject-search" type="search" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Buscar Materia" autoComplete="off" />
        <button className="cp-text-button" type="button" onClick={resetFilters}>Limpiar</button>
      </label>
      <div className="cp-filters">
        <ControlPointFilter label="Tipo" ariaLabel="Filtrar por tipo de examen" icon="type" value={filters.type} options={availableTypes.map((type) => ({ value: type, label: formatExamType(type) }))} onChange={(type) => setFilters({ ...filters, type })} disabled={isLoading || availableTypes.length === 0} />
        <ControlPointFilter label="Estado" ariaLabel="Filtrar por estado" icon="status" value={filters.status} options={['En curso', 'Próximamente', 'Finalizado'].map((status) => ({ value: status, label: status, status }))} onChange={(status) => setFilters({ ...filters, status })} />
        <ControlPointFilter label="Gestión" ariaLabel="Filtrar por gestión" icon="term" value={filters.term} options={availableTerms.map((term) => ({ value: term, label: term }))} onChange={(term) => setFilters({ ...filters, term })} disabled={isLoading || availableTerms.length === 0} />
      </div>
      {termWarning && <p className="cp-muted" role="status">El filtro de gestión no está disponible. <button type="button" className="cp-text-button" onClick={retry}>Reintentar</button></p>}
      <div className="cp-count"><span>Materias</span><span>{new Set(visibleExams.map((exam) => exam.course_group_id)).size}</span></div>
      {isLoading && <p className="cp-feedback" role="status">Cargando puntos de control...</p>}
      {error && <div className="cp-feedback cp-error" role="alert"><p>{error}</p><button type="button" className="cp-text-button" onClick={retry}>Reintentar</button></div>}
      {!isLoading && !error && (
        <section className="cp-exam-list" aria-label="Exámenes y aulas de control">
          {visibleExams.flatMap((exam) => {
            const assignedRooms = exam.rooms.filter((room) => canUseControlPoint(room, userId));
            // Each assigned control point opens directly. Room information stays
            // in the accessible label and the destination header.
            const choices = assignedRooms.length > 0 ? assignedRooms : [null];
            return choices.map((room) => (
              <button
                type="button"
                className="cp-exam-row"
                key={`${exam.exam_id}-${room?.room_id ?? 'unassigned'}`}
                disabled={!room}
                aria-label={`${exam.subject_name}, grupo ${exam.group}, ${formatExamType(exam.exam_type)}, ${room ? `abrir control en ${room.room_name}` : 'sin aula asignada a tu usuario'}`}
                onClick={() => { if (room) onSelect({ exam, room }); }}
              >
                <span className="cp-exam-name">
                  {exam.subject_name}
                </span>
                <span className="cp-chip">G{exam.group}</span>
                <span className="cp-chip" title={formatExamType(exam.exam_type)}>{abbreviateExamType(exam.exam_type)}</span>
                <span className={`cp-status-dot cp-status-${getControlPointStatus(exam, now).replaceAll(' ', '-').toLowerCase()}`} role="img" aria-label={getControlPointStatus(exam, now)} title={getControlPointStatus(exam, now)} />
                {room && <ControlPointIcon name="chevron" />}
              </button>
            ));
          })}
          {exams.length === 0 && <p className="cp-feedback">No hay exámenes disponibles.</p>}
          {exams.length > 0 && visibleExams.length === 0 && <div className="cp-feedback"><p>No se encontraron exámenes con estos filtros.</p><button className="cp-text-button" type="button" onClick={resetFilters}>Limpiar filtros</button></div>}
          {exams.length > 0 && !exams.some((exam) => exam.rooms.some((room) => canUseControlPoint(room, userId))) && <p className="cp-feedback">No tienes aulas asignadas para controlar. Puedes consultar los exámenes disponibles.</p>}
        </section>
      )}
      <button className="cp-primary cp-cancel" type="button" onClick={onBack}>Cancelar</button>
    </main>
  );
}
