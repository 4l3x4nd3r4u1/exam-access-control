import { ControlPointIcon } from './ControlPointIcon';
import { filterControlPointStudents } from '../utils/controlPoint';
import type { EnrolledStudent } from '../types/course';

interface ControlPointStudentSearchProps {
  students: EnrolledStudent[];
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (student: EnrolledStudent) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  busy?: boolean;
  disabled?: boolean;
  showSuggestions?: boolean;
  onCheck?: () => void;
}

export function ControlPointStudentSearch({
  students, query, onQueryChange, onSelect, isLoading, error, onRetry,
  busy = false, disabled = false, showSuggestions = true, onCheck,
}: ControlPointStudentSearchProps) {
  const locked = busy || disabled;
  const matches = filterControlPointStudents(students, query);
  const visibleMatches = matches.slice(0, 30);
  return (
    <section className="cp-student-search" aria-label="Buscar estudiante">
      <form onSubmit={(event) => { event.preventDefault(); if (!locked && onCheck) onCheck(); }}>
        <label className="cp-search" htmlFor="cp-student-query">
          <ControlPointIcon name="search" />
          <span className="cp-sr-only">Nombre, SIS o CI del estudiante</span>
          <input id="cp-student-query" type="search" placeholder="Buscar por nombre, SIS o CI" value={query} maxLength={100} disabled={locked} onChange={(event) => onQueryChange(event.target.value)} autoComplete="off" />
          {query && <button className="cp-text-button" type="button" onClick={() => onQueryChange('')} disabled={locked}>Limpiar</button>}
        </label>
        {onCheck && query.trim() && <button className="cp-primary cp-check-button" type="submit" disabled={locked || query.trim().length > 50}>{busy ? 'Validando ingreso...' : 'Validar SIS o CI'}</button>}
      </form>
      {isLoading && <p className="cp-feedback" role="status">Cargando estudiantes...</p>}
      {error && <div className="cp-feedback cp-error" role="alert"><p>{error}</p><button className="cp-text-button" type="button" disabled={locked} onClick={onRetry}>Reintentar</button></div>}
      {showSuggestions && !isLoading && !error && (
        <>
          {matches.length > 0 ? (
            <div className="cp-students" aria-label="Coincidencias de estudiantes">
              <div className="cp-student-columns" aria-hidden="true"><span>Nombre</span><span>SIS</span><span>CI</span></div>
              {visibleMatches.map((student) => (
                <button type="button" className="cp-student-row" key={student.userId} disabled={locked} onClick={() => onSelect(student)} aria-label={`Seleccionar a ${student.fullName}, SIS ${student.studentKey}, CI ${student.ci}`}>
                  <span>{student.fullName}</span><span>{student.studentKey || '—'}</span><span>{student.ci || '—'}</span>
                </button>
              ))}
              {matches.length > visibleMatches.length && <p className="cp-muted">Mostrando {visibleMatches.length} de {matches.length}. Escribe más datos para precisar la búsqueda.</p>}
            </div>
          ) : <p className="cp-feedback">{query.trim()
            ? `No hay coincidencias en los inscritos de esta materia.${onCheck ? ' Puedes validar un SIS o CI completo.' : ''}`
            : 'No hay estudiantes inscritos en esta materia.'}</p>}
        </>
      )}
    </section>
  );
}
