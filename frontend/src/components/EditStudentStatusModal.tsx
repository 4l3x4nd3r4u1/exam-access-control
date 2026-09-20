import React, { useState, useEffect } from 'react';
import type { EnrolledStudent } from '../types/course';

interface EditStudentStatusModalProps {
  isOpen: boolean;
  student: EnrolledStudent | null;
  onClose: () => void;
  onSave: (studentKey: string, status: 'Habilitado' | 'Inhabilitado', ineligibilityReason: string) => Promise<void> | void;
}

export const EditStudentStatusModal: React.FC<EditStudentStatusModalProps> = ({
  isOpen,
  student,
  onClose,
  onSave,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<'Habilitado' | 'Inhabilitado'>('Habilitado');
  const [ineligibilityReason, setIneligibilityReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setSelectedStatus(student.status);
      setIneligibilityReason(student.ineligibilityReason || '');
    }
  }, [student]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !student) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(student.studentKey, selectedStatus, ineligibilityReason.trim());
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-student-status-title"
    >
      <div
        className="student-status-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="edit-student-status-title" className="student-status-modal-title">
          Editar estado
        </h2>

        <form onSubmit={handleSubmit} className="student-status-modal-form">
          <div className="student-status-info-row">
            <span className="status-info-label">Estudiante:</span>
            <span className="status-info-value">{student.fullName}</span>
          </div>

          <div className="student-status-info-row">
            <span className="status-info-label">codigo:</span>
            <span className="status-info-value">{student.studentKey}</span>
          </div>

          <div className="student-status-info-row student-status-select-row">
            <label htmlFor="student-status-dropdown" className="status-info-label">
              estado:
            </label>
            <div className="status-select-wrapper">
              <select
                id="student-status-dropdown"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as 'Habilitado' | 'Inhabilitado')}
                className="student-status-dropdown"
              >
                <option value="Habilitado">Habilitado</option>
                <option value="Inhabilitado">Inhabilitado</option>
              </select>
            </div>
          </div>

          <div className="status-motive-box">
            <label htmlFor="student-ineligibility-motive" className="status-motive-label">
              motivo
            </label>
            <textarea
              id="student-ineligibility-motive"
              value={ineligibilityReason}
              onChange={(e) => setIneligibilityReason(e.target.value)}
              placeholder="Ingrese el motivo de habilitación / inhabilitación..."
              rows={3}
              className="status-motive-textarea"
            />
          </div>

          <div className="student-status-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="status-modal-cancel-btn"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="status-modal-save-btn"
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
