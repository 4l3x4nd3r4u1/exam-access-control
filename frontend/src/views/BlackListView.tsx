import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { blackListService } from '../services/blackListService';
import type {
  BlackListDetail,
  BlackListSort,
  BlackListStudent,
} from '../types/blackList';
import { formatExamType } from '../utils/examFormat';
import '../styles/blackList.css';

interface BlackListViewProps {
  onBack: () => void;
  onLogout: () => void;
}

function formatShortDate(value?: string | null): string {
  if (!value) return 'Sin fecha';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('es-BO');
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'No disponible';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}:\d{2}))?/);
  if (match) {
    const datePart = `${match[3]}/${match[2]}/${match[1]}`;
    return match[4] ? `${datePart} · ${match[4]}` : datePart;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Topbar({
  onBack,
  onLogout,
  backLabel,
}: {
  onBack: () => void;
  onLogout: () => void;
  backLabel: string;
}) {
  return (
    <header className="bl-topbar">
      <button
        type="button"
        className="bl-icon-btn"
        onClick={onBack}
        aria-label={backLabel}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 12H4M10 6l-6 6 6 6" />
        </svg>
      </button>

      <button
        type="button"
        className="bl-icon-btn"
        onClick={onLogout}
        aria-label="Cerrar sesión"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="4.25" />
          <path d="M4.5 21c.85-4 3.3-6 7.5-6s6.65 2 7.5 6" />
        </svg>
      </button>
    </header>
  );
}

export function BlackListView({ onBack, onLogout }: BlackListViewProps) {
  const [students, setStudents] = useState<BlackListStudent[]>([]);
  const [availableGestiones, setAvailableGestiones] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [gestion, setGestion] = useState('');
  const [sort, setSort] = useState<BlackListSort>('recent');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null,
  );
  const [studentDetail, setStudentDetail] = useState<BlackListDetail | null>(
    null,
  );
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadStudents = useCallback(
    async (
      searchValue = search,
      gestionValue = gestion,
      sortValue = sort,
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await blackListService.getStudents({
          search: searchValue.trim() || undefined,
          type: 'expulsions',
          gestion: gestionValue || undefined,
          sort: sortValue,
        });
        setStudents(result.students);
        setAvailableGestiones(result.availableGestiones);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo cargar la lista de estudiantes.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [gestion, search, sort],
  );

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    blackListService
      .getStudents({
        search: search.trim() || undefined,
        type: 'expulsions',
        gestion: gestion || undefined,
        sort,
      })
      .then((result) => {
        if (isMounted) {
          setStudents(result.students);
          setAvailableGestiones(result.availableGestiones);
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'No se pudo cargar la lista de estudiantes.',
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
    // Initial load & reactive filter/sort updates; explicit search submit handled via handleSearch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gestion, sort]);

  const handleSearchChange = (value: string) => {
    const validName = /^[\p{L}\s]*$/u.test(value);
    const validNumber = /^\d*$/.test(value);

    if (validName || validNumber) {
      setSearch(value);

      if (value.trim() === '') {
        void loadStudents('', gestion, sort);
      }
    }
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadStudents(search.trim(), gestion, sort);
  };

  const handleOpenStudent = async (userId: number) => {
    setSelectedStudentId(userId);
    setStudentDetail(null);
    setDetailError(null);
    setIsDetailLoading(true);

    try {
      const data = await blackListService.getStudentDetail(userId, 'expulsions');
      setStudentDetail(data);
    } catch (requestError) {
      setDetailError(
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo obtener el historial de expulsiones del estudiante.',
      );
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleBackToList = () => {
    setSelectedStudentId(null);
    setStudentDetail(null);
    setDetailError(null);
  };

  // PANTALLA DETALLE: Historial de expulsiones del estudiante
  if (selectedStudentId !== null) {
    const expulsionCount =
      studentDetail?.total_expulsiones ??
      studentDetail?.total_inhabilitaciones ??
      0;

    return (
      <main className="app-shell bl-screen">
        <Topbar
          onBack={handleBackToList}
          onLogout={onLogout}
          backLabel="Volver al listado"
        />

        <section className="bl-heading">
          <h1>Historial de expulsiones</h1>
          {studentDetail && (
            <p>
              {expulsionCount}{' '}
              {expulsionCount === 1
                ? 'expulsión registrada'
                : 'expulsiones registradas'}
            </p>
          )}
        </section>

        {isDetailLoading && (
          <p className="bl-feedback">Cargando historial de expulsiones...</p>
        )}

        {detailError && (
          <section className="bl-feedback" role="alert">
            <p className="bl-error">{detailError}</p>
            <button
              type="button"
              className="bl-detail-back"
              onClick={handleBackToList}
            >
              Volver al listado
            </button>
          </section>
        )}

        {studentDetail && !isDetailLoading && (
          <section className="bl-detail">
            <div className="bl-student-data">
              <div>
                <span>Nombre completo</span>
                <strong>{studentDetail.nombre}</strong>
              </div>

              <div>
                <span>Código SIS</span>
                <strong>{studentDetail.codigo_sis}</strong>
              </div>

              <div>
                <span>Cédula de identidad</span>
                <strong>{studentDetail.ci || 'No registrado'}</strong>
              </div>
            </div>

            <h2 className="bl-section-title">Historial en exámenes</h2>

            <div className="bl-records-list">
              {studentDetail.antecedentes.map((antecedent, index) => {
                const subtitleParts = [
                  antecedent.materia || 'Sin sigla',
                  antecedent.tipo_examen
                    ? formatExamType(antecedent.tipo_examen)
                    : null,
                ].filter(Boolean);

                return (
                  <article
                    className={`bl-record-card ${index % 2 === 1 ? 'is-alt' : ''}`}
                    key={`${antecedent.materia ?? 'mat'}-${antecedent.fecha}-${index}`}
                  >
                    <div className="bl-record-head">
                      <div className="bl-record-title-row">
                        <strong>
                          {antecedent.nombre_materia || 'Materia no disponible'}
                        </strong>

                        <span className="bl-expulsion-tag">
                          <span
                            className="bl-expulsion-tag-dot"
                            aria-hidden="true"
                          />
                          Expulsión
                        </span>
                      </div>

                      <span className="bl-record-subtitle">
                        {subtitleParts.join(' · ')}
                      </span>
                    </div>

                    <div className="bl-record-meta">
                      <p>
                        <span>Grupo:</span> {antecedent.grupo || 'No disponible'}
                      </p>
                      <p>
                        <span>Gestión:</span>{' '}
                        {antecedent.gestion || 'No disponible'}
                      </p>
                      <p>
                        <span>Fecha:</span> {formatDateTime(antecedent.fecha)}
                      </p>
                      <p>
                        <span>Punto de control:</span>{' '}
                        {antecedent.aula || 'No registrado'}
                      </p>
                      <p>
                        <span>Registrado por:</span>{' '}
                        {antecedent.registrado_por ||
                          antecedent.docente ||
                          'No disponible'}
                      </p>
                    </div>

                    <div className="bl-record-reason">
                      <span>Motivo de expulsión</span>
                      <p>{antecedent.motivo || 'Sin motivo registrado'}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>
    );
  }

  // PANTALLA LISTADO: Lista negra de expulsiones
  const hasActiveSearchOrFilter = Boolean(search.trim() || gestion);

  return (
    <main className="app-shell bl-screen">
      <Topbar
        onBack={onBack}
        onLogout={onLogout}
        backLabel="Volver al panel"
      />

      <section className="bl-heading">
        <h1>Registro de infractores</h1>
        <p>
          {students.length}{' '}
          {students.length === 1
            ? 'estudiante con expulsiones'
            : 'estudiantes con expulsiones'}
        </p>
      </section>

      <form className="bl-search" onSubmit={handleSearch}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 4.5 4.5" />
        </svg>

        <input
          type="text"
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Buscar por nombre, código SIS o CI"
          maxLength={150}
          aria-label="Buscar estudiante"
        />

        <button type="submit" disabled={isLoading}>
          Buscar
        </button>
      </form>

      <div className="bl-filters">
        <div className="bl-filter-cell">
          <select
            className="bl-filter-select"
            value={gestion}
            onChange={(event) => setGestion(event.target.value)}
            aria-label="Filtrar por gestión"
          >
            <option value="">Gestión: Todas</option>
            {availableGestiones.map((item) => (
              <option key={item} value={item}>
                Gestión: {item}
              </option>
            ))}
          </select>

          <svg className="bl-filter-chevron" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3 4.5L6 7.5L9 4.5" />
          </svg>
        </div>

        <div className="bl-filter-cell">
          <select
            className="bl-filter-select"
            value={sort}
            onChange={(event) => setSort(event.target.value as BlackListSort)}
            aria-label="Ordenar listado"
          >
            <option value="recent">Orden: Más recientes</option>
            <option value="count">Orden: Más expulsiones</option>
          </select>

          <svg className="bl-filter-chevron" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3 4.5L6 7.5L9 4.5" />
          </svg>
        </div>
      </div>

      <section className="bl-list" aria-label="Registro de infractores">
        <div className="bl-list-header">
          <span>Estudiante</span>
          <span>Código SIS</span>
          <span>Expuls.</span>
        </div>

        {isLoading && (
          <p className="bl-feedback">Cargando registro de infractores...</p>
        )}

        {error && (
          <p className="bl-feedback bl-error" role="alert">
            {error}
          </p>
        )}

        {!isLoading && !error && students.length === 0 && (
          <div className="bl-empty-state">
            <div className="bl-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>

            <h2>
              {hasActiveSearchOrFilter
                ? 'No se encontraron coincidencias para tu búsqueda'
                : 'No hay estudiantes con expulsiones registradas'}
            </h2>
            <p>
              {hasActiveSearchOrFilter
                ? 'Prueba con otro nombre, código SIS, CI o cambia el filtro de gestión.'
                : 'Los estudiantes expulsados durante un examen aparecerán automáticamente en este historial.'}
            </p>
          </div>
        )}

        {!isLoading &&
          !error &&
          students.map((student) => {
            const count =
              student.total_expulsiones ?? student.total_inhabilitaciones;

            return (
              <button
                type="button"
                className="bl-list-row"
                key={student.user_id}
                onClick={() => void handleOpenStudent(student.user_id)}
              >
                <div className="bl-student-cell">
                  <strong>{student.nombre}</strong>
                  <small>
                    CI: {student.ci || 'No registrado'} · Últ.:{' '}
                    {formatShortDate(student.ultima_fecha)}
                  </small>
                </div>

                <span className="bl-sis-cell">{student.codigo_sis}</span>

                <span className="bl-expulsion-cell">
                  <span className="bl-count-pill">
                    <span className="bl-count-dot" aria-hidden="true" />
                    {count}
                  </span>

                  <svg
                    className="bl-row-chevron"
                    viewBox="0 0 12 12"
                    aria-hidden="true"
                  >
                    <path d="M4.5 2.5L8 6L4.5 9.5" />
                  </svg>
                </span>
              </button>
            );
          })}
      </section>
    </main>
  );
}
