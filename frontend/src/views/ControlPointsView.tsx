import { useEffect, useState } from 'react';
import { ControlPointIcon } from '../components/ControlPointIcon';
import { controlPointService } from '../services/controlPointService';
import { abbreviateExamType, canUseControlPoint, filterControlPointExams, getControlPointStatus } from '../utils/controlPoint';
import { formatExamType, formatTime } from '../utils/examFormat';
import type { ControlPointExam, ControlPointSelection } from '../types/controlPoint';
import type { CourseGroup } from '../types/course';
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
    ])
      .then(([examResult, groupResult]) => {
        if (controller.signal.aborted) return;
        if (examResult.status === 'rejected') throw examResult.reason;
        setExams(examResult.value);
        setGroups(groupResult.status === 'fulfilled' ? groupResult.value : []);
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
  const availableTypes = [...new Set(['PRIMER PARCIAL', 'SEGUNDO PARCIAL', 'EXAMEN FINAL', 'SEGUNDA INSTANCIA', 'EXAMEN DE MESA', ...exams.map((exam) => exam.exam_type.toUpperCase().trim())])];
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
        <select aria-label="Filtrar por tipo de examen" value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}>
          <option value="">Tipo</option>
          {availableTypes.map((type) => <option key={type} value={type}>{formatExamType(type)}</option>)}
        </select>
        <select aria-label="Filtrar por estado" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option value="">Estado</option>
          {['En curso', 'Próximamente', 'Finalizado'].map((status) => <option key={status}>{status}</option>)}
        </select>
        <select aria-label="Filtrar por gestión" value={filters.term} disabled={availableTerms.length === 0} onChange={(event) => setFilters({ ...filters, term: event.target.value })}>
          <option value="">Gestión</option>
          {availableTerms.map((term) => <option key={term}>{term}</option>)}
        </select>
      </div>
      {termWarning && <p className="cp-muted" role="status">El filtro de gestión no está disponible. <button type="button" className="cp-text-button" onClick={retry}>Reintentar</button></p>}
      <div className="cp-count"><span>Materias</span><span>{new Set(visibleExams.map((exam) => exam.course_group_id)).size}</span></div>
      {isLoading && <p className="cp-feedback" role="status">Cargando puntos de control...</p>}
      {error && <div className="cp-feedback cp-error" role="alert"><p>{error}</p><button type="button" className="cp-text-button" onClick={retry}>Reintentar</button></div>}
      {!isLoading && !error && (
        <section className="cp-exam-list" aria-label="Exámenes y aulas de control">
          {visibleExams.map((exam) => (
            <details className="cp-exam-row" key={exam.exam_id}>
              <summary>
                <span className="cp-exam-name">{exam.subject_name}</span>
                <span className="cp-chip">G{exam.group}</span>
                <span className="cp-chip" title={formatExamType(exam.exam_type)}>{abbreviateExamType(exam.exam_type)}</span>
                <span className={`cp-status-dot cp-status-${getControlPointStatus(exam, now).replaceAll(' ', '-').toLowerCase()}`} role="img" aria-label={getControlPointStatus(exam, now)} title={getControlPointStatus(exam, now)} />
                <ControlPointIcon name="chevron" />
              </summary>
              <div className="cp-room-list">
                <p className="cp-muted">{exam.date} · {formatTime(exam.start_time)}–{formatTime(exam.end_time)}</p>
                {exam.rooms.map((room) => {
                  const allowed = canUseControlPoint(room, userId);
                  return (
                    <button type="button" className="cp-room-button" key={room.room_id} disabled={!allowed} onClick={() => { if (allowed) onSelect({ exam, room }); }}>
                      <ControlPointIcon name="room" />
                      <span><strong>{room.room_name}</strong><small>{allowed ? 'Asignada a ti · Abrir control' : room.assistant_id == null ? 'Sin responsable asignado' : 'Asignada a otro responsable'}</small></span>
                      {allowed && <ControlPointIcon name="chevron" />}
                    </button>
                  );
                })}
                {exam.rooms.length === 0 && <p className="cp-muted">Sin aulas asignadas.</p>}
              </div>
            </details>
          ))}
          {exams.length === 0 && <p className="cp-feedback">No hay exámenes disponibles.</p>}
          {exams.length > 0 && visibleExams.length === 0 && <div className="cp-feedback"><p>No se encontraron exámenes con estos filtros.</p><button className="cp-text-button" type="button" onClick={resetFilters}>Limpiar filtros</button></div>}
          {exams.length > 0 && !exams.some((exam) => exam.rooms.some((room) => canUseControlPoint(room, userId))) && <p className="cp-feedback">No tienes aulas asignadas para controlar. Puedes consultar los exámenes disponibles.</p>}
        </section>
      )}
      <button className="cp-primary cp-cancel" type="button" onClick={onBack}>Cancelar</button>
    </main>
  );
}
