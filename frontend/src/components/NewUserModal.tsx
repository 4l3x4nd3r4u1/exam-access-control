import React, { useState } from 'react';
import { Modal } from './Modal';
import type { UserRole } from '../types/auth';
import type { AcademicStaffMember } from '../types/staff';
import { staffService } from '../services/staffService';

interface NewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: (newUser: AcademicStaffMember) => void;
}

const INSTITUTIONAL_EMAIL_REGEX = /@(fcyt\.umss\.edu\.bo|umss\.edu\.bo)$/i;

export const NewUserModal: React.FC<NewUserModalProps> = ({ isOpen, onClose, onUserCreated }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('TEACHER');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('TEACHER');
    setErrorMessage(null);
    setEmailError(null);
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (val.trim() && !INSTITUTIONAL_EMAIL_REGEX.test(val.trim())) {
      setEmailError('El correo debe terminar en @fcyt.umss.edu.bo o @umss.edu.bo');
    } else {
      setEmailError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validaciones locales obligatorias
    if (!name.trim()) {
      setErrorMessage('El nombre completo es obligatorio.');
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('El correo institucional es obligatorio.');
      return;
    }

    if (!INSTITUTIONAL_EMAIL_REGEX.test(cleanEmail)) {
      setErrorMessage('El correo debe pertenecer al dominio institucional (@fcyt.umss.edu.bo o @umss.edu.bo).');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('La contraseña provisional debe tener al menos 6 caracteres.');
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
    <Modal isOpen={isOpen} onClose={handleModalClose} title="Nuevo Usuario">
      <form onSubmit={handleSubmit} className="new-user-form">
        <p className="modal-description">
          Registra al personal académico asignándole su correo universitario y clave provisional.
        </p>

        {errorMessage && (
          <div className="form-alert-error" role="alert">
            {errorMessage}
          </div>
        )}

        {/* Campo Nombre */}
        <div className="form-group">
          <label htmlFor="user-name-input" className="form-label">
            Nombre completo *
          </label>
          <input
            id="user-name-input"
            type="text"
            className="modal-input"
            placeholder="Ej. Eddy Escalera Balderrama"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        {/* Campo Correo */}
        <div className="form-group">
          <label htmlFor="user-email-input" className="form-label">
            Correo institucional (@umss / @fcyt) *
          </label>
          <input
            id="user-email-input"
            type="email"
            className={`modal-input ${emailError ? 'input-error' : ''}`}
            placeholder="ejemplo@fcyt.umss.edu.bo"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            disabled={loading}
            required
          />
          {emailError && <span className="field-hint-error">{emailError}</span>}
        </div>

        {/* Campo Contraseña Provisional */}
        <div className="form-group">
          <label htmlFor="user-password-input" className="form-label">
            Clave provisional *
          </label>
          <input
            id="user-password-input"
            type="password"
            className="modal-input"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
            minLength={6}
          />
        </div>

        {/* Selector de Rol */}
        <div className="form-group">
          <label htmlFor="user-role-select" className="form-label">
            Rol asignado *
          </label>
          <select
            id="user-role-select"
            className="modal-select"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            disabled={loading}
          >
            <option value="TEACHER">Docente</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={handleModalClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={loading || Boolean(emailError)}
          >
            {loading ? 'Registrando...' : 'Guardar cuenta'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
