import { useEffect, useMemo, useState } from 'react';

import { courseService } from '../services/courseService';
import { staffService } from '../services/staffService';

import type { UserSession } from '../types/auth';
import type { AcademicStaffMember } from '../types/staff';

import { TeacherCoursesView } from './TeacherCoursesView';

export type CourseFunctionMode =
  | 'VIEW'
  | 'STUDENTS'
  | 'SCHEDULE_EXAM'
  | 'EXAMS'
  | 'ELIGIBILITY';

interface AssignedCoursesViewProps {
  session: UserSession;
  mode: CourseFunctionMode;
  onBack: () => void;
  onLogout: () => void;
}

interface TeacherSelection {
  userId: number;
  fullName: string;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isTeacher(member: AcademicStaffMember): boolean {
  return member.roles.includes('DOCENTE');
}

export function AssignedCoursesView({
  session,
  mode,
  onBack,
  onLogout,
}: AssignedCoursesViewProps) {
  const [staff, setStaff] = useState<AcademicStaffMember[]>([]);
  const [search, setSearch] = useState('');

  const [selectedTeacher, setSelectedTeacher] =
    useState<TeacherSelection | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [hasOwnCourses, setHasOwnCourses] =
    useState(false);

  useEffect(() => {
    let isMounted = true;

    staffService
      .getAcademicStaff()
      .then((members) => {
        if (isMounted) {
          setStaff(members.filter(isTeacher));
        }
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'No se pudo cargar la lista de docentes.',
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

  useEffect(() => {
    let isMounted = true;

    courseService
      .getTeacherCourses(session.user_id)
      .then((courses) => {
        if (isMounted) {
          setHasOwnCourses(courses.length > 0);
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasOwnCourses(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session.user_id]);

  const visibleTeachers = useMemo(() => {
    const query = normalizeSearchText(search);

    if (!query) {
      return staff;
    }

    return staff.filter((member) =>
      normalizeSearchText(
        `${member.full_name} ${member.email}`,
      ).includes(query),
    );
  }, [search, staff]);

  if (selectedTeacher) {
    return (
      <TeacherCoursesView
        teacherId={selectedTeacher.userId}
        teacherName={selectedTeacher.fullName}
        mode={mode}
        onBack={() => setSelectedTeacher(null)}
        onLogout={onLogout}
      />
    );
  }

  return (
    <main className="app-shell assigned-courses-screen">
      <header className="assigned-courses-topbar">
        <button
          type="button"
          className="assigned-courses-back"
          onClick={onBack}
          aria-label="Volver al panel"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M20 12H4M10 6l-6 6 6 6" />
          </svg>
        </button>

        <button
          type="button"
          className="assigned-courses-profile"
          onClick={onLogout}
          aria-label="Cerrar sesión"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="8"
              r="4.25"
            />

            <path d="M4.5 21c.85-4 3.3-6 7.5-6s6.65 2 7.5 6" />
          </svg>
        </button>
      </header>

      <section className="assigned-courses-heading">
        <h1>
          Visualizar
          <br />
          Materias asignadas
        </h1>

        <p>
          Selecciona un docente para consultar sus materias.
        </p>
      </section>

      {hasOwnCourses && (
        <button
          type="button"
          className="assigned-courses-own-button"
          onClick={() =>
            setSelectedTeacher({
              userId: session.user_id,
              fullName: session.full_name,
            })
          }
        >
          Mis materias
        </button>
      )}

      <label
        className="assigned-courses-search"
        htmlFor="teacher-search"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            cx="11"
            cy="11"
            r="7"
          />

          <path d="m16 16 5 5" />
        </svg>

        <input
          id="teacher-search"
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Buscar docente"
          autoComplete="off"
        />
      </label>

      <section
        className="assigned-courses-directory"
        aria-label="Docentes"
      >
        <div className="assigned-courses-count">
          <span>Personas</span>
          <strong>{visibleTeachers.length}</strong>
        </div>

        <div className="assigned-courses-table-header">
          <span>rol</span>
          <span>nombre</span>
        </div>

        {isLoading && (
          <p className="assigned-courses-feedback">
            Cargando docentes...
          </p>
        )}

        {error && (
          <p
            className="assigned-courses-feedback assigned-courses-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {!isLoading &&
          !error &&
          visibleTeachers.map((teacher) => (
            <button
              type="button"
              className="assigned-courses-row"
              key={teacher.user_id}
              onClick={() =>
                setSelectedTeacher({
                  userId: teacher.user_id,
                  fullName: teacher.full_name,
                })
              }
            >
              <span>Docente</span>
              <span>{teacher.full_name}</span>
            </button>
          ))}

        {!isLoading &&
          !error &&
          visibleTeachers.length === 0 && (
            <p className="assigned-courses-feedback">
              No se encontraron docentes.
            </p>
          )}
      </section>

      <button
        type="button"
        className="assigned-courses-close"
        onClick={onBack}
      >
        Cancelar
      </button>
    </main>
  );
}