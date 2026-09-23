import { useState } from 'react';
import { BottomDrawer } from './BottomDrawer';
import { courseService } from '../services/courseService';
import type { EnrolledStudent } from '../types/course';

interface StudentStatusDrawerProps {
  isOpen: boolean;
  courseGroupId: string;
  student: EnrolledStudent;
  onClose: () => void;
  onSaved: (student: EnrolledStudent) => void;
}

export function StudentStatusDrawer({ isOpen, courseGroupId, student, onClose, onSaved }: StudentStatusDrawerProps) {
  const [status, setStatus] = useState<EnrolledStudent['status']>(student.status);
  const [reason, setReason] = useState(student.ineligibilityReason ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (!isSaving) onClose();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanReason = reason.trim();

    if (status === 'INHABILITADO' && !cleanReason) {
      setError('El motivo es obligatorio para inhabilitar al estudiante.');
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await courseService.updateStudentStatus(courseGroupId, student.studentKey, status, cleanReason);
      onSaved({
        ...student,
        status,
        ineligibilityReason: status === 'INHABILITADO' ? cleanReason : null,
      });
      onClose();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo actualizar el estado.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomDrawer isOpen={isOpen} onClose={handleClose} ariaLabel="Editar estado">
      <form className="student-status-drawer-content" onSubmit={handleSubmit}>
        <h2>Editar estado</h2>

        <dl className="student-status-info">
          <div><dt>Estudiante:</dt><dd>{student.fullName}</dd></div>
          <div><dt>código:</dt><dd>{student.studentKey}</dd></div>
          <div>
            <dt>estado:</dt>
            <dd>
              <select value={status} onChange={(event) => setStatus(event.target.value as EnrolledStudent['status'])}>
                <option value="HABILITADO">Habilitado</option>
                <option value="INHABILITADO">Inhabilitado</option>
              </select>
            </dd>
          </div>
        </dl>

        <label className="student-status-reason" htmlFor="ineligibility-reason">
          <span>motivo</span>
          <textarea
            id="ineligibility-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={status === 'INHABILITADO' ? 'Escriba el motivo' : 'Sin motivo'}
            disabled={status === 'HABILITADO'}
          />
        </label>

        {error && <p className="student-status-error" role="alert">{error}</p>}

        <div className="student-status-actions">
          <button type="button" className="drawer-cancel-button" onClick={handleClose} disabled={isSaving}>Cancelar</button>
          <button type="submit" className="drawer-submit-button" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar cambios'}</button>
        </div>
      </form>
    </BottomDrawer>
  );
}
