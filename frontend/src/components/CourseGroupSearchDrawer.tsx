import { useEffect, useMemo, useState } from 'react';

import { BottomDrawer } from './BottomDrawer';
import { courseService } from '../services/courseService';
import { normalizeText } from '../utils/searchHelper';
import type { CourseGroup } from '../types/course';

interface CourseGroupSearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Se invoca con el grupo elegido; el padre guarda su course_group_id. */
  onSelect: (courseGroup: CourseGroup) => void;
/**
 * Permite mostrar el filtro "Mis materias".
 * Las materias del usuario se obtienen mediante
 * GET /teachers/{user_id}/courses.
 */
  showMyCourses?: boolean;
  currentUserId: number;
  ariaLabel?: string;
  onlyTeacherCourses?: boolean;
}  

const ALL_TERMS = '';

function CourseGroupSearchContent({
  onClose,
  onSelect,
  showMyCourses = false,
  currentUserId,
  onlyTeacherCourses = false,
}: Omit<CourseGroupSearchDrawerProps, 'isOpen' | 'ariaLabel'>) {
  const [courseGroups, setCourseGroups] = useState<CourseGroup[]>([]);
  const [myCourseIds, setMyCourseIds] = useState<Set<string> | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMine, setIsLoadingMine] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState(ALL_TERMS);

  // 1) Datos base del buscador: si onlyTeacherCourses es true, pide las materias asignadas al docente
  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    const request = onlyTeacherCourses
      ? courseService.getTeacherCourses(currentUserId)
      : courseService.getCourseGroups();

    request
      .then((items) => {
        if (isMounted) setCourseGroups(items);
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : onlyTeacherCourses
                ? 'No se pudieron cargar las materias del docente.'
                : 'No se pudo cargar la lista de materias.',
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [onlyTeacherCourses, currentUserId]);

  // 2) "Mis materias": GET /teachers/{user_id}/courses (se pide una sola vez)
  const toggleOnlyMine = () => {
    if (onlyMine) {
      setOnlyMine(false);
      return;
    }

    setOnlyMine(true);

    if (myCourseIds !== null) return;

    setIsLoadingMine(true);
    setError(null);
    courseService
      .getTeacherCourses(currentUserId)
      .then((items) => {
        setMyCourseIds(new Set(items.map((item) => item.course_group_id)));
      })
      .catch((requestError: unknown) => {
        setOnlyMine(false);
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudieron cargar tus materias.',
        );
      })
      .finally(() => setIsLoadingMine(false));
  };

  const availableTerms = useMemo(
    () =>
      [...new Set(courseGroups.map((group) => group.academic_term))]
        .filter(Boolean)
        .sort()
        .reverse(),
    [courseGroups],
  );

  const visibleGroups = useMemo(() => {
    const query = normalizeText(search);

    return courseGroups.filter((group) => {
      if (term !== ALL_TERMS && group.academic_term !== term) return false;
      if (onlyMine && myCourseIds && !myCourseIds.has(group.course_group_id)) {
        return false;
      }
      if (!query) return true;

      return normalizeText(
        `${group.subject_name} ${group.subject_code} ${group.group_code} ${group.academic_term}`,
      ).includes(query);
    });
  }, [courseGroups, myCourseIds, onlyMine, search, term]);

  const busy = isLoading || isLoadingMine;

  return (
    <div className="cg-drawer">
      <label className="cg-search" htmlFor="cg-search-input">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m16 16 5 5" />
        </svg>

        <input
          id="cg-search-input"
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

      <div className="cg-filters">
        <label className="cg-term-select">
          <span className="cg-visually-hidden">Gestión</span>
          <select
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            aria-label="Filtrar por gestión"
          >
            <option value={ALL_TERMS}>Gestión</option>
            {availableTerms.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        {!onlyTeacherCourses && showMyCourses && (
          <button
            type="button"
            className={`cg-mine-chip${onlyMine ? ' is-active' : ''}`}
            aria-pressed={onlyMine}
            onClick={toggleOnlyMine}
          >
            Mis materias
          </button>
        )}
      </div>

      <div className="cg-count">
        <span>Materias</span>
        <strong>{visibleGroups.length}</strong>
      </div>

      <div className="cg-list" role="list" aria-label="Materias">
        {busy && <p className="cg-feedback">Cargando materias...</p>}

        {error && (
          <p className="cg-feedback cg-error" role="alert">
            {error}
          </p>
        )}

        {!busy &&
          !error &&
          visibleGroups.map((group) => (
            <button
              type="button"
              role="listitem"
              className="cg-row"
              key={group.course_group_id}
              onClick={() => onSelect(group)}
            >
              <span className="cg-row-name">{group.subject_name}</span>
              <span className="cg-chip">G:{group.group_code}</span>
              <span className="cg-chip">{group.academic_term}</span>
            </button>
          ))}

        {!busy && !error && visibleGroups.length === 0 && (
          <p className="cg-feedback">
            {onlyTeacherCourses
              ? 'No tienes materias asignadas.'
              : 'No se encontraron materias.'}
          </p>
        )}
      </div>

      <button type="button" className="cg-cancel" onClick={onClose}>
        Cancelar
      </button>
    </div>
  );
}

export function CourseGroupSearchDrawer({
  isOpen,
  onClose,
  ariaLabel = 'Buscar materia',
  ...contentProps
}: CourseGroupSearchDrawerProps) {
  return (
    <BottomDrawer isOpen={isOpen} onClose={onClose} ariaLabel={ariaLabel}>
      {/* Se monta solo con el drawer abierto: cada apertura empieza limpia. */}
      <CourseGroupSearchContent onClose={onClose} {...contentProps} />
    </BottomDrawer>
  );
}
