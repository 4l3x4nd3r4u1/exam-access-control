import { useCallback, useEffect, useState } from 'react';
import academicStaffIcon from '../assets/personal_academico.svg';
import { AcademicUserDrawer } from '../components/NewAcademicUserDrawer';
import { staffService } from '../services/staffService';
import type { AcademicStaffMember } from '../types/staff';

interface AcademicStaffViewProps {
  onBack: () => void;
}

function formatRole(role: string): string {
  const labels: Record<string, string> = {
    ADMIN: 'Administrador',
    AUXILIAR: 'Auxiliar',
    ASSISTANT: 'Auxiliar',
    DOCENTE: 'Docente',
    TEACHER: 'Docente',
  };

  return labels[role] ?? role;
}

export function AcademicStaffView({ onBack }: AcademicStaffViewProps) {
  const [staff, setStaff] = useState<AcademicStaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewUserDrawerOpen, setIsNewUserDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AcademicStaffMember | null>(null);

  const loadStaff = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const members = await staffService.getAcademicStaff();
      setStaff(members);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el personal académico.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    staffService.getAcademicStaff()
      .then((members) => {
        if (isMounted) setStaff(members);
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el personal académico.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="app-shell academic-staff-screen">
      <header className="academic-staff-topbar">
        <button type="button" className="academic-staff-back" onClick={onBack} aria-label="Volver al panel">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12H4M10 6l-6 6 6 6" />
          </svg>
        </button>
        <button type="button" className="academic-staff-add" onClick={() => {
          setSelectedUser(null);
          setIsNewUserDrawerOpen(true);
        }} aria-label="Crear usuario">
          +
        </button>
      </header>

      <section className="academic-staff-hero">
        <img src={academicStaffIcon} alt="" className="academic-staff-hero-icon" />
        <h1>Personal Académico</h1>
        <p>{staff.length} {staff.length === 1 ? 'usuario' : 'usuarios'}</p>
      </section>

      <section className="academic-staff-list" aria-label="Listado de personal académico">
        <div className="academic-staff-table-header">
          <span>rol</span>
          <span>nombre</span>
          <span aria-hidden="true" />
        </div>

        {isLoading && <p className="academic-staff-feedback">Cargando personal académico...</p>}
        {error && <p className="academic-staff-feedback academic-staff-error" role="alert">{error}</p>}
        {!isLoading && !error && staff.map((member) => (
          <div className="academic-staff-row" key={member.user_id}>
            <span>{formatRole(member.role)}</span>
            <span title={member.full_name}>{member.full_name}</span>
            <button type="button" className="academic-staff-edit" onClick={() => {
              setSelectedUser(member);
              setIsNewUserDrawerOpen(true);
            }}>Editar</button>
          </div>
        ))}
      </section>

      {isNewUserDrawerOpen && (
        <AcademicUserDrawer
          isOpen
          user={selectedUser}
          onClose={() => {
            setIsNewUserDrawerOpen(false);
            setSelectedUser(null);
          }}
          onSaved={() => void loadStaff()}
        />
      )}
    </main>
  );
}
