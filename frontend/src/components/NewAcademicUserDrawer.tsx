import { useEffect, useState } from 'react';

import { BottomDrawer } from './BottomDrawer';
import { ConfirmModal } from './ConfirmModal';

import { catalogService } from '../services/catalogService';
import { staffService } from '../services/staffService';
import { formatRoleLabel } from '../services/jwtHelper';

import type { CatalogItem } from '../services/catalogService';
import type { AcademicStaffMember } from '../types/staff';

interface AcademicUserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (user?: AcademicStaffMember) => void;
  user?: AcademicStaffMember | null;
}

export function AcademicUserDrawer({
  isOpen,
  onClose,
  onSaved,
  user = null,
}: AcademicUserDrawerProps) {
  const [fullName, setFullName] =
    useState(user?.full_name ?? '');

  const [ci, setCi] = useState('');

  const [email, setEmail] =
    useState(user?.email ?? '');

  const [password, setPassword] =
    useState('');

  const [selectedRoles, setSelectedRoles] =
    useState<string[]>([]);

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] =
    useState(false);

  const [roles, setRoles] =
    useState<CatalogItem[]>([]);

  const [showPassword, setShowPassword] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isConfirmOpen, setIsConfirmOpen] =
    useState(false);

  const [isLoadingRoles, setIsLoadingRoles] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const isEditing = user !== null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    setIsLoadingRoles(true);
    setError(null);

    catalogService
      .getRoles()
      .then((availableRoles) => {
        if (!isMounted) {
          return;
        }

        setRoles(availableRoles);

        if (
          !user &&
          selectedRoles.length === 0 &&
          availableRoles.length > 0
        ) {
          const firstRoleName = String(
            availableRoles[0].label,
          ).toUpperCase().trim();
          setSelectedRoles([firstRoleName]);
        }
      })
      .catch((requestError: unknown) => {
        if (!isMounted) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudieron cargar los roles.',
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingRoles(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFullName(user?.full_name ?? '');
    setCi('');
    setEmail(user?.email ?? '');
    setPassword('');
    setSelectedRoles(
      user?.roles && user.roles.length > 0
        ? user.roles.map((r) => r.toUpperCase().trim())
        : ['DOCENTE']
    );
    setIsRoleDropdownOpen(false);
    setShowPassword(false);
    setError(null);
  }, [isOpen, user]);

  const closeDrawer = () => {
    if (isSaving) {
      return;
    }

    setError(null);
    setIsConfirmOpen(false);
    setIsRoleDropdownOpen(false);
    onClose();
  };

  const handleToggleRole = (roleKey: string) => {
    const normalized = roleKey.toUpperCase().trim();
    setSelectedRoles((prev) => {
      if (prev.includes(normalized)) {
        return prev.filter((r) => r !== normalized);
      }
      return [...prev, normalized];
    });
  };

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (selectedRoles.length === 0) {
      setError('Debe seleccionar al menos un rol.');
      return;
    }

    setError(null);
    setIsConfirmOpen(true);
  };

  const executeSave = async () => {
    setError(null);
    setIsSaving(true);

    try {
      if (user) {
        const updatedUser: AcademicStaffMember = {
          ...user,
          role,
        };

        onSaved(updatedUser);
        return;
      } else {
        await staffService.registerAcademicUser({ fullName, email, password, role });
      }

      setIsConfirmOpen(false);
      setFullName('');
      setCi('');
      setEmail('');
      setPassword('');
      setSelectedRoles(['DOCENTE']);

      onSaved();
      onClose();
    } catch (requestError: unknown) {
      setIsConfirmOpen(false);
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo guardar el usuario.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomDrawer
      isOpen={isOpen}
      onClose={closeDrawer}
      ariaLabel={
        isEditing
          ? 'Editar usuario'
          : 'Nuevo usuario'
      }
    >
      <form
        className="new-user-drawer-content"
        onSubmit={handleSubmit}
      >
        <h2>
          {isEditing
            ? 'Editar usuario'
            : 'Nuevo usuario'}
        </h2>

        {!isEditing && (
          <>
            <label
              className="drawer-input-card"
              htmlFor="new-user-name"
            >
              <span>Nombre</span>

              <input
                id="new-user-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </label>

            <label
              className="drawer-input-card"
              htmlFor="new-user-email"
            >
              <span>Correo Institucional</span>

              <input
                id="new-user-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label
              className="drawer-input-card"
              htmlFor="new-user-password"
            >
              <span>Contraseña</span>

              <span className="drawer-password-field">
                <input
                  id="new-user-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((visible) => !visible)
                  }
                  aria-label={
                    showPassword
                      ? 'Ocultar contraseña'
                      : 'Mostrar contraseña'
                  }
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                    <circle cx="12" cy="12" r="2.75" />
                  </svg>
                </button>
              </span>
            </label>
          </>
        )}

        <div className="drawer-role-field">
          <span>Rol</span>

          <div className="drawer-role-select-wrapper">
            <button
              type="button"
              id="new-user-role"
              className="drawer-role-select-trigger"
              onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
              aria-expanded={isRoleDropdownOpen}
              disabled={isLoadingRoles}
            >
              <span className="drawer-role-selected-text">
                {isLoadingRoles
                  ? 'Cargando roles...'
                  : selectedRoles.length > 0
                    ? selectedRoles.map((r) => formatRoleLabel(r)).join(', ')
                    : 'Seleccione uno o más roles'}
              </span>
              <svg
                className={`drawer-role-chevron ${isRoleDropdownOpen ? 'open' : ''}`}
                viewBox="0 0 20 20"
                width="16"
                height="16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {isRoleDropdownOpen && (
              <div className="drawer-role-dropdown-menu">
                {roles.map((availableRole) => {
                  const roleKey = String(availableRole.label).toUpperCase().trim();
                  const isChecked = selectedRoles.includes(roleKey);
                  return (
                    <button
                      type="button"
                      key={availableRole.value}
                      className={`drawer-role-dropdown-item ${isChecked ? 'selected' : ''}`}
                      onClick={() => handleToggleRole(roleKey)}
                    >
                      <span>{availableRole.label}</span>
                      <span className="drawer-role-item-check" aria-hidden="true">
                        {isChecked ? '✓' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedRoles.length > 0 && (
            <div className="drawer-role-chips-summary">
              {selectedRoles.map((roleKey) => (
                <span key={roleKey} className="drawer-role-pill">
                  {roleKey}
                  <button
                    type="button"
                    className="drawer-role-pill-remove"
                    onClick={() => handleToggleRole(roleKey)}
                    aria-label={`Quitar ${roleKey}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p
            className="drawer-error"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="drawer-actions">
          <button
            type="button"
            className="drawer-cancel-button"
            onClick={closeDrawer}
            disabled={isSaving}
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="drawer-submit-button"
            disabled={
              isSaving ||
              isLoadingRoles ||
              selectedRoles.length === 0
            }
          >
            {isSaving
              ? 'Guardando...'
              : isEditing
                ? 'Guardar cambios'
                : 'Crear usuario'}
          </button>
        </div>
      </form>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title={isEditing ? 'Confirmar edición de usuario' : 'Confirmar registro'}
        message={
          <div>
            <p>
              {isEditing
                ? '¿Estás seguro de que deseas guardar los cambios para este usuario?'
                : '¿Estás seguro de que deseas registrar este nuevo personal académico?'}
            </p>
            <div className="confirm-modal-summary-box">
              <div><strong>Nombre:</strong> {fullName}</div>
              <div><strong>Correo:</strong> {email}</div>
              {!isEditing && ci && <div><strong>CI:</strong> {ci}</div>}
              <div><strong>Roles:</strong> {selectedRoles.map((r) => formatRoleLabel(r)).join(', ')}</div>
            </div>
          </div>
        }
        confirmLabel={isEditing ? 'Sí, guardar cambios' : 'Sí, registrar'}
        cancelLabel="Cancelar"
        isLoading={isSaving}
        onConfirm={executeSave}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </BottomDrawer>
  );
}