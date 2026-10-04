import { useEffect, useState, useMemo } from 'react';
import { staffService } from '../services/staffService';
import { catalogService } from '../services/catalogService';
import { authService } from '../services/authService';
import { formatRoleLabel } from '../services/jwtHelper';
import { filterAndRankStaff } from '../utils/searchHelper';
import { HighlightedText } from './HighlightedText';
import type { AcademicStaffMember } from '../types/staff';

interface EditRolesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: number;
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

export function EditRolesModal({ isOpen, onClose, currentUserId }: EditRolesModalProps) {
  const [staff, setStaff] = useState<AcademicStaffMember[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<AcademicStaffMember | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeUserId = currentUserId ?? authService.getStoredSession()?.user_id;

  const isSelf = useMemo(() => {
    if (!selectedUser || !activeUserId) return false;
    return selectedUser.user_id === activeUserId;
  }, [selectedUser, activeUserId]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setError(null);
    setSelectedUser(null);
    setSearchTerm('');

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
  }, [isOpen]);

  const filteredStaff = useMemo(() => {
    return filterAndRankStaff(staff, searchTerm);
  }, [staff, searchTerm]);

  const handleOpenEditRole = (member: AcademicStaffMember) => {
    setSelectedUser(member);
    const currentRoles = normalizeRoles(member);
    setUserRoles(currentRoles);
    setModalError(null);
  };

  const handleToggleRole = (roleId: string) => {
    setUserRoles((prev) => {
      if (prev.includes(roleId)) {
        return prev.filter((role) => role !== roleId);
      }
      return [...prev, roleId];
    });
  };

  const handleSaveRoles = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUser) return;

    if (isSelf) {
      setModalError('No puede cambiar sus propios roles.');
      return;
    }

    if (userRoles.length === 0) {
      setModalError('Debe seleccionar al menos un rol.');
      return;
    }

    setIsSaving(true);
    setModalError(null);

    try {
      const response = await staffService.updateUserRoles(selectedUser.user_id, userRoles);
      setStaff((prev) =>
        prev.map((member) =>
          member.user_id === selectedUser.user_id
            ? { ...member, roles: userRoles, role: userRoles.join(', ') }
            : member
        )
      );

      setToastMessage(response.message || 'Roles actualizados exitosamente');
      setTimeout(() => setToastMessage(null), 3000);
      setSelectedUser(null);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Error al actualizar roles.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const rolesToDisplay = availableRoles;

  return (
    <div className="popup-modal-backdrop" onClick={onClose}>
      {toastMessage && (
        <div className="popup-toast-pill" role="status">
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {selectedUser ? (
        <div
          className="popup-modal-window popup-edit-role-card"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <h2 className="popup-modal-title">Editar rol</h2>

          <form onSubmit={handleSaveRoles} className="popup-form-body">
            <div className="modal-input-card">
              <span className="modal-input-card-label">Nombre</span>
              <span className="modal-input-card-value">{selectedUser.full_name}</span>
            </div>

            <div className="modal-role-select-row">
              <label className="modal-role-label">Rol</label>
              <div className="modal-multi-select-box">
                {rolesToDisplay.map((role) => {
                  const isChecked = userRoles.includes(role.id);
                  return (
                    <button
                      type="button"
                      key={role.id}
                      className={`modal-select-item-btn ${isChecked ? 'is-selected' : ''}`}
                      onClick={() => handleToggleRole(role.id)}
                    >
                      <span className="modal-select-item-label">{role.label}</span>
                      <span className="modal-select-item-check" aria-hidden="true">
                        {isChecked && (
                          <svg viewBox="0 0 12 10" width="12" height="10" fill="none" stroke="#007aff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1.5 5.5 4.5 8 10.5 1.5" />
                          </svg>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {isSelf && (
              <p className="modal-error-text" role="alert">
                No puedes modificar tus propios roles.
              </p>
            )}

            {modalError && (
              <p className="modal-error-text" role="alert">
                {modalError}
              </p>
            )}

            <div className="modal-actions-row">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setSelectedUser(null)}
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="modal-save-btn"
                disabled={isSaving || userRoles.length === 0 || isSelf}
              >
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div
          className="popup-modal-window popup-search-staff-card"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="popup-search-input-wrapper">
            <span className="search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              className="popup-search-field"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar..."
              aria-label="Buscar personal"
              autoFocus
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

          <div className="popup-staff-list-scroll">
            {isLoading && (
              <div className="edit-roles-state-feedback">
                <div className="edit-roles-spinner" aria-hidden="true" />
                <p>Cargando personal...</p>
              </div>
            )}

            {error && (
              <div className="edit-roles-state-feedback edit-roles-error-feedback" role="alert">
                <p>{error}</p>
              </div>
            )}

            {!isLoading && !error && filteredStaff.length === 0 && (
              <div className="edit-roles-state-feedback">
                <p>No se encontraron coincidencias para "{searchTerm}"</p>
              </div>
            )}

            {!isLoading && !error && filteredStaff.length > 0 && (
              <div className="popup-staff-rows-container">
                {filteredStaff.map((member) => {
                  const roles = normalizeRoles(member);
                  return (
                    <button
                      type="button"
                      key={member.user_id}
                      className="popup-staff-row-item"
                      onClick={() => handleOpenEditRole(member)}
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
          </div>

          <div className="popup-modal-footer">
            <button type="button" className="popup-modal-cancel-btn" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
