import { useState } from 'react';
import { BottomDrawer } from './BottomDrawer';
import { staffService } from '../services/staffService';
import type { AcademicStaffMember } from '../types/staff';

interface AcademicUserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  user?: AcademicStaffMember | null;
}

type AcademicRole = 'DOCENTE' | 'AUXILIAR' | 'ADMIN';

function toFormRole(role: string): AcademicRole {
  if (role === 'ADMIN') return 'ADMIN';
  if (role === 'AUXILIAR' || role === 'ASSISTANT') return 'AUXILIAR';
  return 'DOCENTE';
}

export function AcademicUserDrawer({ isOpen, onClose, onSaved, user = null }: AcademicUserDrawerProps) {
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AcademicRole>(user ? toFormRole(user.role) : 'DOCENTE');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = user !== null;

  const closeDrawer = () => {
    if (isSaving) return;
    setError(null);
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      if (user) {
        await staffService.updateAcademicUser(user.user_id, {
          fullName,
          email,
          role,
          ...(password ? { newPassword: password } : {}),
        });
      } else {
        await staffService.registerAcademicUser({ fullName, email, password, role });
      }
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('DOCENTE');
      onSaved();
      onClose();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo crear el usuario.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomDrawer isOpen={isOpen} onClose={closeDrawer} ariaLabel={isEditing ? 'Editar usuario' : 'Nuevo usuario'}>
      <form className="new-user-drawer-content" onSubmit={handleSubmit}>
        <h2>{isEditing ? 'Editar usuario' : 'Nuevo usuario'}</h2>

        <label className="drawer-input-card" htmlFor="new-user-name">
          <span>Nombre</span>
          <input id="new-user-name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
        </label>

        <label className="drawer-input-card" htmlFor="new-user-email">
          <span>Correo Institucional</span>
          <input id="new-user-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>

        <label className="drawer-input-card" htmlFor="new-user-password">
          <span>Contraseña</span>
          <span className="drawer-password-field">
            <input
              id="new-user-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isEditing ? 'Dejar vacía para no cambiar' : ''}
              required={!isEditing}
            />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                <circle cx="12" cy="12" r="2.75" />
              </svg>
            </button>
          </span>
        </label>

        <label className="drawer-role-field" htmlFor="new-user-role">
          <span>Rol</span>
          <select id="new-user-role" value={role} onChange={(event) => setRole(event.target.value as AcademicRole)}>
            <option value="DOCENTE">Docente</option>
            <option value="AUXILIAR">Auxiliar</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </label>

        {error && <p className="drawer-error" role="alert">{error}</p>}

        <div className="drawer-actions">
          <button type="button" className="drawer-cancel-button" onClick={closeDrawer} disabled={isSaving}>Cancelar</button>
          <button type="submit" className="drawer-submit-button" disabled={isSaving}>
            {isSaving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </BottomDrawer>
  );
}
