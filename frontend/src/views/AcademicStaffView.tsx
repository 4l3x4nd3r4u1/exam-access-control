import { useEffect, useState } from 'react';

import academicStaffIcon from '../assets/personal_academico.svg';

import { staffService } from '../services/staffService';

import type { AcademicStaffMember } from '../types/staff';

interface AcademicStaffViewProps {
  onBack: () => void;
}

function formatRole(role: string): string {
  const normalized = (role || '').toUpperCase().trim();
  const labels: Record<string, string> = {
    ADMIN: 'Administrador',
    ADMINISTRADOR: 'Administrador',
    AUXILIAR: 'Auxiliar',
    ASSISTANT: 'Auxiliar',
    DOCENTE: 'Docente',
    TEACHER: 'Docente',
    ESTUDIANTE: 'Estudiante',
    STUDENT: 'Estudiante',
  };

  if (labels[normalized]) {
    return labels[normalized];
  }

  return role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : '';
}

export function AcademicStaffView({ onBack }: AcademicStaffViewProps) {
  const [staff, setStaff] = useState<AcademicStaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStaff = staff.filter((member) => {
    const search = searchTerm.toLowerCase().trim();

    if (!search) return true;

    return (
      member.full_name.toLowerCase().includes(search) ||
<<<<<<< HEAD
      (member.role ?? '').toLowerCase().includes(search)
=======
      (member.role ?? member.roles.join(', ')).toLowerCase().includes(search)
>>>>>>> 02d9c6f707e7b501b0c4fb6ad1c8edee91a433e4
    );
  });

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    staffService
      .getAcademicStaff()
      .then((members) => {
        if (isMounted) {
          setStaff(members);
        }
      })
      .catch((requestError: unknown) => {
        if (!isMounted) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo cargar el personal académico.',
        );
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

  return (
    <main className="app-shell academic-staff-screen">
      <header className="academic-staff-topbar">
        <button
          type="button"
          className="academic-staff-back"
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
      </header>

      <section className="academic-staff-hero">
        <img
          src={academicStaffIcon}
          alt=""
          className="academic-staff-hero-icon"
        />

        <h1>
          Personal Académico
        </h1>

        <p>
          {staff.length}{' '}
          {staff.length === 1
            ? 'usuario'
            : 'usuarios'}
        </p>
      </section>

      <section className="academic-staff-list" aria-label="Listado de personal académico">

        <div className="academic-staff-search">
          <input
            type="text"
            placeholder="Buscar usuario..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            aria-label="Buscar usuario"
          />
        </div>

        <div className="academic-staff-table-header">
          <span>rol</span>
          <span>nombre</span>
        </div>

        {isLoading && <p className="academic-staff-feedback">Cargando personal académico...</p>}
        {error && <p className="academic-staff-feedback academic-staff-error" role="alert">{error}</p>}
        {!isLoading && !error && filteredStaff.map((member) => (
          <div className="academic-staff-row" key={member.user_id}>
<<<<<<< HEAD
            <span>{formatRole(member.role ?? '')}</span>
            <span title={member.full_name}>{member.full_name}</span>
          </div >
        ))
}

{
  !isLoading &&
    !error &&
    staff.length === 0 && (
      <p className="academic-staff-feedback">
        No hay personal académico registrado.
      </p>
    )
}
       </section >
=======
            <span>{formatRole(member.role ?? member.roles[0] ?? '')}</span>
            <span title={member.full_name}>{member.full_name}</span>
          </div>
        ))}
      </section>
>>>>>>> 02d9c6f707e7b501b0c4fb6ad1c8edee91a433e4
    </main >
  );
}
