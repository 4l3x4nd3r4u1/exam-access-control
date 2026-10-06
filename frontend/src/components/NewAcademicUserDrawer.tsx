import { useEffect, useState } from 'react';

import { BottomDrawer } from './BottomDrawer';

import { catalogService } from '../services/catalogService';
import { staffService } from '../services/staffService';

import type { CatalogItem } from '../services/catalogService';
import type { AcademicStaffMember } from '../types/staff';

interface AcademicUserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
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
    useState<string[]>(user?.roles ?? []);

  const [roles, setRoles] =
    useState<CatalogItem[]>([]);

  const [showPassword, setShowPassword] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isLoadingRoles, setIsLoadingRoles] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState(false);

  const isEditing = user !== null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    setIsLoadingRoles(true);
    setError(null);
    setSuccess(false);

    catalogService
      .getRoles()
      .then((availableRoles) => {
        if (!isMounted) {
          return;
        }

        setRoles(availableRoles);
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
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFullName(user?.full_name ?? '');
    setCi('');
    setEmail(user?.email ?? '');
    setPassword('');
    setSelectedRoles(user?.roles ?? []);
    setShowPassword(false);
    setError(null);
    setSuccess(false);
  }, [isOpen, user]);

  const closeDrawer = () => {
    if (isSaving) {
      return;
    }

    setError(null);
    setSuccess(false);
    onClose();
  };

  const handleToggleRole = (
    roleValue: string,
  ) => {
    setSelectedRoles((currentRoles) => {
      if (
        currentRoles.includes(roleValue)
      ) {
        return currentRoles.filter(
          (currentRole) =>
            currentRole !== roleValue,
        );
      }

      return [
        ...currentRoles,
        roleValue,
      ];
    });

    setError(null);
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError(null);
    setSuccess(false);

    if (selectedRoles.length === 0) {
      setError(
        'Seleccione al menos un rol.',
      );
      return;
    }

    setIsSaving(true);

    try {
      if (user) {
        /*
         * La edición general mantiene el contrato
         * existente. La edición de múltiples roles
         * se realiza desde EditRolesDrawer.
         */
        await staffService.updateAcademicUser(
          user.user_id,
          {
            fullName,
            email,
            role: selectedRoles[0],
            ...(password
              ? {
                  newPassword:
                    password,
                }
              : {}),
          },
        );
      } else {
        await staffService.registerAcademicUser({
          fullName,
          ci,
          email,
          password,
          roles: selectedRoles,
        });
      }

      setSuccess(true);

      onSaved();

      setTimeout(() => {
        setFullName('');
        setCi('');
        setEmail('');
        setPassword('');
        setSelectedRoles([]);
        setSuccess(false);

        onClose();
      }, 900);
    } catch (requestError: unknown) {
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

        <label
          className="drawer-input-card"
          htmlFor="new-user-name"
        >
          <span>Nombre</span>

          <input
            id="new-user-name"
            value={fullName}
            onChange={(event) =>
              setFullName(
                event.target.value,
              )
            }
            required
          />
        </label>

        {!isEditing && (
          <label
            className="drawer-input-card"
            htmlFor="new-user-ci"
          >
            <span>CI</span>

            <input
              id="new-user-ci"
              value={ci}
              onChange={(event) =>
                setCi(
                  event.target.value,
                )
              }
              required
            />
          </label>
        )}

        <label
          className="drawer-input-card"
          htmlFor="new-user-email"
        >
          <span>
            Correo Institucional
          </span>

          <input
            id="new-user-email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value,
              )
            }
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
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              placeholder={
                isEditing
                  ? 'Dejar vacía para no cambiar'
                  : ''
              }
              required={!isEditing}
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (visible) =>
                    !visible,
                )
              }
              aria-label={
                showPassword
                  ? 'Ocultar contraseña'
                  : 'Mostrar contraseña'
              }
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />

                <circle
                  cx="12"
                  cy="12"
                  r="2.75"
                />
              </svg>
            </button>
          </span>
        </label>

        <div className="drawer-role-field">
          <span>Roles</span>

          <div className="modal-multi-select-box">
            {isLoadingRoles ? (
              <p>
                Cargando roles...
              </p>
            ) : (
              roles.map(
                (availableRole) => {
                  const roleValue =
                    String(
                      availableRole.value,
                    );

                  const isSelected =
                    selectedRoles.includes(
                      roleValue,
                    );

                  return (
                    <button
                      key={roleValue}
                      type="button"
                      className={`modal-select-item-btn ${
                        isSelected
                          ? 'is-selected'
                          : ''
                      }`}
                      onClick={() =>
                        handleToggleRole(
                          roleValue,
                        )
                      }
                    >
                      <span className="modal-select-item-label">
                        {
                          availableRole.label
                        }
                      </span>

                      <span
                        className="modal-select-item-check"
                        aria-hidden="true"
                      >
                        {isSelected && (
                          <svg
                            viewBox="0 0 12 10"
                            width="12"
                            height="10"
                            fill="none"
                            stroke="#007aff"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="1.5 5.5 4.5 8 10.5 1.5" />
                          </svg>
                        )}
                      </span>
                    </button>
                  );
                },
              )
            )}
          </div>
        </div>

        {error && (
          <p
            className="drawer-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {success && (
          <p
            className="drawer-success"
            role="status"
          >
            {isEditing
              ? 'Usuario actualizado correctamente.'
              : 'Usuario registrado correctamente.'}
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
              selectedRoles.length === 0 ||
              success
            }
          >
            {isSaving
              ? 'Guardando...'
              : success
                ? '¡Guardado!'
                : isEditing
                  ? 'Guardar cambios'
                  : 'Crear usuario'}
          </button>
        </div>
      </form>
    </BottomDrawer>
  );
}