import React, { useState } from 'react';
import { Modal } from './Modal';
import type { UserRole } from '../types/auth';
import type { AcademicStaffMember } from '../types/staff';
import { staffService } from '../services/staffService';

interface NewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: (newUser: AcademicStaffMember) => void;
  existingEmails?: string[];
}

const INSTITUTIONAL_EMAIL_REGEX = /@(fcyt\.umss\.edu\.bo|umss\.edu\.bo)$/i;

export const NewUserModal: React.FC<NewUserModalProps> = ({
  isOpen,
  onClose,
  onUserCreated,
  existingEmails = [],
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('TEACHER');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('TEACHER');
    setShowPassword(false);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Criterio 13 y 14: Validar campos obligatorios
    if (!name.trim()) {
      setErrorMessage('El nombre del usuario es obligatorio.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('El correo institucional es obligatorio.');
      return;
    }

    // Criterio 4: Validar dominio institucional
    if (!INSTITUTIONAL_EMAIL_REGEX.test(cleanEmail)) {
      setErrorMessage('El correo debe pertenecer al dominio institucional (@fcyt.umss.edu.bo o @umss.edu.bo).');
      return;
    }

    // Criterio 12: Verificar correo duplicado
    if (existingEmails.map((em) => em.toLowerCase()).includes(cleanEmail)) {
      setErrorMessage('El correo ya está registrado');
      return;
    }

    if (!password || password.length < 4) {
      setErrorMessage('La contraseña es obligatoria (mínimo 4 caracteres).');
      return;
    }

    setLoading(true);

    try {
      const created = await staffService.createStaff({
        name: name.trim(),
        email: cleanEmail,
        password,
        role,
      });

      onUserCreated(created);
      resetForm();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al registrar personal académico.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleModalClose} title="Nuevo usuario">
      <form onSubmit={handleSubmit} className="figma-modal-form">
        {errorMessage && (
          <div className="form-alert-error" role="alert">
            {errorMessage}
          </div>
        )}

        {/* Campo: Nombre */}
        <div className="figma-input-card">
          <label htmlFor="user-name-input" className="figma-field-label">
            Nombre
          </label>
          <input
            id="user-name-input"
            type="text"
            className="figma-field-input"
            placeholder="Escalera Balderrama Eddy"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        {/* Campo: Correo Institucional */}
        <div className="figma-input-card">
          <label htmlFor="user-email-input" className="figma-field-label">
            Correo Institucional
          </label>
          <input
            id="user-email-input"
            type="email"
            className="figma-field-input"
            placeholder="eddy@fcyt.umss.edu.bo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        {/* Campo: Contraseña con icono de ojo */}
        <div className="figma-input-card">
          <label htmlFor="user-password-input" className="figma-field-label">
            Contraseña
          </label>
          <div className="figma-password-row">
            <input
              id="user-password-input"
              type={showPassword ? 'text' : 'password'}
              className="figma-field-input"
              placeholder="••••••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="button"
              className="figma-eye-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Campo: Rol (Criterio 7: Administrador, Docente y Auxiliar) */}
        <div className="figma-input-card">
          <label htmlFor="user-role-select" className="figma-field-label">
            Rol
          </label>
          <select
            id="user-role-select"
            className="figma-field-select"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            disabled={loading}
          >
            <option value="TEACHER">Docente</option>
            <option value="ASSISTANT">Auxiliar</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>

        {/* Botones de acción inferiores según Figma iPhone 17-15 */}
        <div className="figma-modal-actions">
          <button
            type="button"
            className="btn-figma-cancel"
            onClick={handleModalClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-figma-create"
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
