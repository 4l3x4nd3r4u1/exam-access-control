import { useEffect, useState, useMemo } from 'react';
import { staffService } from '../services/staffService';
import { catalogService } from '../services/catalogService';
import { authService } from '../services/authService';
import { formatRoleLabel } from '../services/jwtHelper';
import { filterAndRankStaff } from '../utils/searchHelper';
import { HighlightedText } from '../components/HighlightedText';
import { EditRolesDrawer } from '../components/EditRolesDrawer';
import type { AcademicStaffMember } from '../types/staff';

interface EditRolesViewProps {
  onBack: () => void;
}

export interface RoleOption {
  id: string;
  label: string;
}

function normalizeRoles(member: AcademicStaffMember): string[] {
  if (Array.isArray(member.roles) && member.roles.length > 0) {
    return member.roles.map((role) => role.toUpperCase());
  }
  if (typeof member.role === 'string' && member.role.trim() !== '') {
    return member.role.split(',').map((role) => role.trim().toUpperCase());
  }
  return [];
}

export function EditRolesView({ onBack }: EditRolesViewProps) {
  const [staff, setStaff] = useState<AcademicStaffMember[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<AcademicStaffMember | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const activeUserId = authService.getStoredSession()?.user_id;

  useEffect(() => {
    let isMounted = true;
    setError(null);

    const cachedStaff = staffService.getCachedStaff();
    const cachedRoles = catalogService.getCachedRoles();

    if (cachedStaff && cachedStaff.length > 0) {
      setStaff(cachedStaff);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    if (cachedRoles && cachedRoles.length > 0) {
      setAvailableRoles(
        cachedRoles.map((item) => {
          const roleKey = String(item.label || item.value).toUpperCase();
          return { id: roleKey, label: formatRoleLabel(roleKey) };
        })
      );
    }

    Promise.all([
      catalogService.getRoles().then((items) => {
        if (isMounted) {
          setAvailableRoles(
            items.map((item) => {
              const roleKey = String(item.label || item.value).toUpperCase();
              return { id: roleKey, label: formatRoleLabel(roleKey) };
            })
          );
        }
      }),
      staffService.getAcademicStaff().then((data) => {
        if (isMounted) setStaff(data);
      }),
    ])
      .catch((err: unknown) => {
        if (isMounted && (!cachedStaff || cachedStaff.length === 0)) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar el personal.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredStaff = useMemo(() => {
    return filterAndRankStaff(staff, searchTerm);
  }, [staff, searchTerm]);

  const handleOpenEditModal = (member: AcademicStaffMember) => {
    setSelectedUser(member);
  };

  const rolesToDisplay = availableRoles;

  return (
    <main className="app-shell edit-roles-screen">
      {successToast && (
        <div className="edit-roles-toast" role="status">
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{successToast}</span>
        </div>
      )}

      <section className="edit-roles-search-bar">
        <div className="search-input-wrapper">
          <span className="search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="search-input-field"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar docente o personal..."
            aria-label="Buscar personal"
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchTerm('')}
            >
              limpiar
            </button>
          )}
        </div>
      </section>

      <section className="edit-roles-list-container" aria-label="Lista de personal académico">
        {isLoading && (
          <div className="edit-roles-state-feedback">
            <div className="edit-roles-spinner" aria-hidden="true" />
            <p>Cargando personal...</p>
          </div>
        )}

        {error && (
          <div className="edit-roles-state-feedback edit-roles-error-feedback" role="alert">
            <p>{error}</p>
            <button type="button" className="retry-btn" onClick={() => window.location.reload()}>
              Reintentar
            </button>
          </div>
        )}

        {!isLoading && !error && filteredStaff.length === 0 && (
          <div className="edit-roles-state-feedback">
            <p>No se encontraron resultados para &quot;{searchTerm}&quot;</p>
          </div>
        )}

        {!isLoading && !error && filteredStaff.length > 0 && (
          <div className="edit-roles-table">
            {filteredStaff.map((member) => {
              const roles = normalizeRoles(member);
              return (
                <button
                  type="button"
                  key={member.user_id}
                  className="edit-roles-row-btn"
                  onClick={() => handleOpenEditModal(member)}
                  title={`Editar roles de ${member.full_name}`}
                >
                  <div className="edit-roles-badges-col">
                    {roles.length > 0 ? (
                      roles.map((role) => (
                        <span key={role} className={`role-badge role-badge-${role.toLowerCase()}`}>
                          {role}
                        </span>
                      ))
                    ) : (
                      <span className="role-badge role-badge-default">SIN ROL</span>
                    )}
                  </div>
                  <div className="edit-roles-name-col">
                    <HighlightedText
                      text={member.full_name}
                      ranges={member._matchMeta?.highlightRanges}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <footer className="edit-roles-footer">
        <button type="button" className="edit-roles-cancel-btn" onClick={onBack}>
          Cancelar
        </button>
      </footer>

      <EditRolesDrawer
        isOpen={Boolean(selectedUser)}
        user={selectedUser}
        availableRoles={rolesToDisplay}
        onClose={() => setSelectedUser(null)}
        onSaved={(updatedUser, updatedRoles) => {
          setStaff((prev) =>
            prev.map((member) =>
              member.user_id === updatedUser.user_id
                ? { ...member, roles: updatedRoles, role: updatedRoles.join(', ') }
                : member
            )
          );
          setSuccessToast('Roles actualizados correctamente.');
          setTimeout(() => setSuccessToast(null), 3500);
          setSelectedUser(null);
        }}
        currentUserId={activeUserId}
      />
    </main>
  );
}
