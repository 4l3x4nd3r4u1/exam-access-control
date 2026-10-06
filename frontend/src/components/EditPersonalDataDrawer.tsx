import { useState } from 'react';
import type { FormEvent } from 'react';
import { BottomDrawer } from './BottomDrawer';
import { staffService } from '../services/staffService';
import type { PersonalDataUpdatePayload } from '../types/staff';
import type { UserSession } from '../types/auth';

interface EditPersonalDataDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession;
  onSuccess: (updated: { fullName: string; ci?: string }) => void;
}

export function EditPersonalDataDrawer({
  isOpen,
  onClose,
  session,
  onSuccess,
}: EditPersonalDataDrawerProps) {
  const [fullName, setFullName] = useState(session.full_name ?? '');
  const [ci, setCi] = useState(session.ci ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeDrawer = () => {
    if (isSaving) return;
    setError(null);
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError('El nombre es obligatorio.');
      return;
    }

    const trimmedPassword = password.trim();
    if (trimmedPassword && trimmedPassword.length < 8) {
      setError('La nueva contraseña debe tener mínimo 8 caracteres.');
      return;
    }

    setIsSaving(true);

    try {
      const payload: PersonalDataUpdatePayload = {
        fullName: trimmedName,
      };

      const initialCi = (session.ci ?? '').trim();
      const currentCi = ci.trim();
      if (currentCi !== initialCi) {
        payload.ci = currentCi;
      }

      if (trimmedPassword) {
        payload.newPassword = trimmedPassword;
      }

      await staffService.updatePersonalData(payload);

      onSuccess({
        fullName: payload.fullName,
        ci: payload.ci !== undefined ? payload.ci : (session.ci ?? undefined),
      });
      onClose();
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No se pudieron actualizar los datos personales.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomDrawer isOpen={isOpen} onClose={closeDrawer} ariaLabel="Editar datos personales">
      <form className="new-user-drawer-content edit-personal-drawer-content" onSubmit={handleSubmit}>
        <h2>Editar datos personales</h2>

        <label className="drawer-input-card" htmlFor="edit-personal-name">
          <span>Nombre</span>
          <input
            id="edit-personal-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
          />
        </label>

        <label className="drawer-input-card" htmlFor="edit-personal-ci">
          <span>ci</span>
          <input
            id="edit-personal-ci"
            type="text"
            value={ci}
            onChange={(e) => setCi(e.target.value)}
            autoComplete="off"
          />
        </label>

        <label className="drawer-input-card" htmlFor="edit-personal-email">
          <span>Correo Institucional</span>
          <input
            id="edit-personal-email"
            type="email"
            value={session.email}
            disabled
            readOnly
          />
        </label>

        <label className="drawer-input-card" htmlFor="edit-personal-password">
          <span>Contrasena</span>
          <span className="drawer-password-field">
            <input
              id="edit-personal-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••••••••••"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6Z" />
                <circle cx="12" cy="12" r="2.75" />
              </svg>
            </button>
          </span>
        </label>

        {error && (
          <p className="drawer-error" role="alert">
            {error}
          </p>
        )}

        <div className="drawer-actions edit-personal-actions">
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
            disabled={isSaving}
          >
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </BottomDrawer>
  );
}
