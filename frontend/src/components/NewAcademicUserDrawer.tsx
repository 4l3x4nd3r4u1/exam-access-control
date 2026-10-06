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

  const [role, setRole] =
    useState<string>(
      user?.roles[0] ?? '',
    );

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
          !role &&
          availableRoles.length > 0
        ) {
          setRole(
            String(
              availableRoles[0].value,
            ),
          );
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
  }, [isOpen, user, role]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFullName(user?.full_name ?? '');
    setCi('');
    setEmail(user?.email ?? '');
    setPassword('');
    setRole(user?.roles[0] ?? '');
    setShowPassword(false);
    setError(null);
  }, [isOpen, user]);

  const closeDrawer = () => {
    if (isSaving) {
      return;
    }

    setError(null);
    onClose();
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!role) {
      setError('Seleccione un rol.');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      if (user) {
        await staffService.updateAcademicUser(
          user.user_id,
          {
            fullName,
            email,
            role,
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
          role,
        });
      }

      setFullName('');
      setCi('');
      setEmail('');
      setPassword('');
      setRole('');

      onSaved();
      onClose();
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
          <span>Correo Institucional</span>

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

        <label
          className="drawer-role-field"
          htmlFor="new-user-role"
        >
          <span>Rol</span>

          <select
            id="new-user-role"
            value={role}
            onChange={(event) =>
              setRole(
                event.target.value,
              )
            }
            disabled={
              isLoadingRoles
            }
            required
          >
            <option value="">
              {isLoadingRoles
                ? 'Cargando roles...'
                : 'Seleccione un rol'}
            </option>

            {roles.map(
              (availableRole) => (
                <option
                  key={
                    availableRole.value
                  }
                  value={String(
                    availableRole.value,
                  )}
                >
                  {
                    availableRole.label
                  }
                </option>
              ),
            )}
          </select>
        </label>

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
              !role
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
    </BottomDrawer>
  );
}