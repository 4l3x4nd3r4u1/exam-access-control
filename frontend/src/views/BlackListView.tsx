
import { useEffect, useState } from 'react';
import { blackListService } from '../services/blackListService';
import type { BlackListStudent,BlackListDetail,} from '../types/blackList';

interface BlackListViewProps {
  onBack: () => void;
  onLogout: () => void;
}

export function BlackListView({ onBack, onLogout }: BlackListViewProps) {
  const [students, setStudents] = useState<BlackListStudent[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = async (value = '') => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await blackListService.getStudents(value);
      setStudents(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo cargar la lista negra.',
      );
    } finally {
      setIsLoading(false);
    }
  };
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [studentDetail, setStudentDetail] = useState<BlackListDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  useEffect(() => {
  let isMounted = true;

  blackListService.getStudents()
    .then((data) => {
      if (isMounted) {
        setStudents(data);
      }
    })
    .catch((requestError) => {
      if (isMounted) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo cargar la lista negra.',
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
}, []);

 const handleSearchChange = (value: string) => {
  const validName = /^[\p{L}\s]*$/u.test(value);
  const validNumber = /^\d*$/.test(value);

  if (validName || validNumber) {
    setSearch(value);

    if (value.trim() === '') {
      loadStudents();
    }
  }
};

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    loadStudents(search.trim());
  };
  
  const handleOpenStudent = async (userId: number) => {
  setSelectedStudentId(userId);
  setStudentDetail(null);
  setDetailError(null);
  setIsDetailLoading(true);

  try {
    const data = await blackListService.getStudentDetail(userId);
    setStudentDetail(data);
  } catch (requestError) {
    setDetailError(
      requestError instanceof Error
        ? requestError.message
        : 'No se pudieron obtener los antecedentes del estudiante.',
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
  
if (selectedStudentId !== null) {
  return (
    <main className="app-shell blacklist-screen">
      <header className="blacklist-topbar">
        <button
          type="button"
          className="blacklist-back"
          onClick={handleBackToList}
          aria-label="Volver al listado"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12H4M10 6l-6 6 6 6" />
          </svg>
        </button>

        <button
          type="button"
          className="blacklist-logout"
          onClick={onLogout}
          aria-label="Cerrar sesión"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4.25" />
            <path d="M4.5 21c.85-4 3.3-6 7.5-6s6.65 2 7.5 6" />
          </svg>
        </button>
      </header>

      <section className="blacklist-heading">
        <h1>Antecedentes del estudiante</h1>
        {studentDetail && (
          <p>
            {studentDetail.total_inhabilitaciones}{' '}
            {studentDetail.total_inhabilitaciones === 1
              ? 'inhabilitación'
              : 'inhabilitaciones'}
          </p>
        )}
      </section>

      {isDetailLoading && (
        <p className="blacklist-feedback">
          Cargando antecedentes...
        </p>
      )}

      {detailError && (
        <section className="blacklist-feedback" role="alert">
          <p>{detailError}</p>
          <button
            type="button"
            className="blacklist-detail-back"
            onClick={handleBackToList}
          >
            Volver al listado
          </button>
        </section>
      )}

      {studentDetail && !isDetailLoading && (
        <section className="blacklist-detail">
          <div className="blacklist-student-data">
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

          <h2>Historial de inhabilitaciones</h2>

          {studentDetail.antecedentes.map((antecedent, index) => (
            <article
              className="blacklist-antecedent"
              key={`${antecedent.materia}-${antecedent.fecha}-${index}`}
            >
              <div className="blacklist-antecedent-heading">
                <strong>
                  {antecedent.nombre_materia || 'Materia no disponible'}
                </strong>
                <span>{antecedent.materia || 'Sin sigla'}</span>
              </div>

              <div className="blacklist-antecedent-info">
                <p>
                  <span>Grupo:</span>{' '}
                  {antecedent.grupo || 'No disponible'}
                </p>

                <p>
                  <span>Gestión:</span>{' '}
                  {antecedent.gestion || 'No disponible'}
                </p>

                <p>
                  <span>Docente:</span>{' '}
                  {antecedent.docente || 'No disponible'}
                </p>

                <p>
                  <span>Fecha:</span>{' '}
                  {antecedent.fecha
                    ? new Date(antecedent.fecha).toLocaleString('es-BO')
                    : 'No disponible'}
                </p>
              </div>

              <div className="blacklist-antecedent-reason">
                <span>Motivo de inhabilitación</span>
                <p>
                  {antecedent.motivo || 'Sin motivo registrado'}
                </p>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

  return (
    <main className="app-shell blacklist-screen">
      <header className="blacklist-topbar">
        <button
          type="button"
          className="blacklist-back"
          onClick={onBack}
          aria-label="Volver al panel"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12H4M10 6l-6 6 6 6" />
          </svg>
        </button>

        <button
          type="button"
          className="blacklist-logout"
          onClick={onLogout}
          aria-label="Cerrar sesión"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4.25" />
            <path d="M4.5 21c.85-4 3.3-6 7.5-6s6.65 2 7.5 6" />
          </svg>
        </button>
      </header>

      <section className="blacklist-heading">
        <h1>Estudiantes inhabilitados</h1>
        <p>
          {students.length} {students.length === 1 ? 'estudiante' : 'estudiantes'}
        </p>
      </section>

      <form className="blacklist-search" onSubmit={handleSearch}>
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

      <section className="blacklist-list" aria-label="Estudiantes inhabilitados">
        <div className="blacklist-list-header">
          <span>Estudiante</span>
          <span>Código SIS</span>
          <span>Inhabilitaciones</span>
        </div>

        {isLoading && (
          <p className="blacklist-feedback">Cargando estudiantes...</p>
        )}

        {error && (
          <p className="blacklist-feedback blacklist-error" role="alert">
            {error}
          </p>
        )}

        {!isLoading && !error && students.length === 0 && (
        <p className="blacklist-feedback">
          {search.trim()
          ? 'No se encontraron coincidencias para tu búsqueda.'
          : 'No hay estudiantes inhabilitados registrados.'}
        </p>
       )}

        {!isLoading && !error && students.map((student) => (
          <button type="button" className="blacklist-list-row" key={student.user_id}
          onClick={() => handleOpenStudent(student.user_id)}
           >
            <div>
              <strong>{student.nombre}</strong>
              <small>CI: {student.ci || 'No registrado'}</small>
            </div>
            <span>{student.codigo_sis}</span>
            <span>{student.total_inhabilitaciones}</span>
          </button>
        ))}
      </section>
    </main>
  );
}
