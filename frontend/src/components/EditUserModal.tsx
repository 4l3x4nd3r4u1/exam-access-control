import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import type { UserRole } from '../types/auth';
import type { AcademicStaffMember } from '../types/staff';
import { staffService } from '../services/staffService';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AcademicStaffMember | null;
  onUserUpdated: (updatedUser: AcademicStaffMember) => void;
  token?: string;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdated,
  token,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('TEACHER');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
      setRole(user.role || 'TEACHER');
      setErrorMessage(null);
    }
  }, [user]);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('El nombre del usuario es obligatorio.');
      return;
    }

    if (!email.trim()) {
      setErrorMessage('El correo electrónico es obligatorio.');
      return;
    }

    setLoading(true);

    try {
      const updated = await staffService.updateStaff(
        user.user_id,
        {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          role,
        },
        token
      );

      onUserUpdated(updated);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al actualizar los datos del usuario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar usuario">
      <form onSubmit={handleSubmit} className="figma-modal-form">
        {errorMessage && (
          <div className="form-alert-error" role="alert">
            {errorMessage}
          </div>
        )}

        {/* Campo: Nombre */}
        <div className="figma-input-card">
          <label htmlFor="edit-user-name" className="figma-field-label">
            Nombre Completo
          </label>
          <input
            id="edit-user-name"
            type="text"
            className="figma-field-input"
            placeholder="Escalera Balderrama Eddy"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        {/* Campo: Correo Electrónico */}
        <div className="figma-input-card">
          <label htmlFor="edit-user-email" className="figma-field-label">
            Correo Institucional
          </label>
          <input
            id="edit-user-email"
            type="email"
            className="figma-field-input"
            placeholder="eddy@fcyt.umss.edu.bo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        {/* Campo: Rol */}
        <div className="figma-input-card">
          <label htmlFor="edit-user-role" className="figma-field-label">
            Rol
          </label>
          <select
            id="edit-user-role"
            className="figma-field-select"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            disabled={loading}
          >
            <option value="ADMIN">Administrador</option>
            <option value="TEACHER">Docente</option>
            <option value="ASSISTANT">Auxiliar</option>
          </select>
        </div>

        {/* Botones de acción */}
        <div className="figma-modal-actions">
          <button
            type="button"
            className="btn-figma-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-figma-create"
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
