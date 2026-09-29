import { useState } from 'react';
import { BottomDrawer } from './BottomDrawer';
import type { TeacherCourse } from '../types/course';

interface ScheduleExamDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  course: TeacherCourse;
  onSaved?: () => void;
}

export function ScheduleExamDrawer({ isOpen, onClose, course, onSaved }: ScheduleExamDrawerProps) {
  const [examType] = useState('Primer Parcial');
  const [examDate] = useState('Miércoles, 24 de septiembre de 2026');
  const [startTime] = useState('06:45 am');
  const [duration] = useState('1h 30min');
  const [endTime] = useState('08:15 am');
  const [classrooms] = useState('Aula 691B, Auditorio');
  const [capacityInfo] = useState(
    course?.total_enrolled
      ? `200 plazas para ${course.total_enrolled} inscritos`
      : '200 plazas para 184 inscritos'
  );
  const [rules] = useState<string[]>([
    'No se permiten celulares',
    'Formulario permitido',
  ]);

  const handleSave = () => {
    if (onSaved) {
      onSaved();
    }
    onClose();
  };

  return (
    <BottomDrawer isOpen={isOpen} onClose={onClose} ariaLabel="Programar Examen">
      <div className="schedule-exam-drawer-content">
        <h2 className="schedule-exam-title">Programar Examen</h2>

        <div className="schedule-exam-row">
          <span className="schedule-exam-label">Tipo de Examen:</span>
          <span className="schedule-exam-value">{examType}</span>
        </div>

        <div className="schedule-exam-section">
          <span className="schedule-exam-label">Fecha:</span>
          <div className="schedule-exam-date-box">
            <div className="schedule-exam-date-left">
              <svg viewBox="0 0 24 24" className="schedule-exam-calendar-icon" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="schedule-exam-date-text">{examDate}</span>
            </div>
            <span className="schedule-exam-chevron-circle" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="schedule-exam-chevron-icon" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          </div>
        </div>

        <div className="schedule-exam-times-block">
          <div className="schedule-exam-spread-row">
            <span className="schedule-exam-label">Hora de inicio:</span>
            <span className="schedule-exam-value">{startTime}</span>
          </div>

          <div className="schedule-exam-spread-row">
            <span className="schedule-exam-label">Duración</span>
            <span className="schedule-exam-value">{duration}</span>
          </div>

          <div className="schedule-exam-spread-row">
            <span className="schedule-exam-label">Hora de finalización:</span>
            <span className="schedule-exam-value">{endTime}</span>
          </div>
        </div>

        <div className="schedule-exam-section">
          <div className="schedule-exam-spread-row">
            <span className="schedule-exam-label">Aulas:</span>
            <span className="schedule-exam-value">{classrooms}</span>
          </div>
          <p className="schedule-exam-subtext">{capacityInfo}</p>
        </div>

        <div className="schedule-exam-section schedule-exam-rules-section">
          <div className="schedule-exam-spread-row">
            <span className="schedule-exam-label">Normas</span>
            <button
              type="button"
              className="schedule-exam-add-rule-btn"
              aria-label="Agregar norma"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          <div className="schedule-exam-rules-list">
            {rules.map((rule, idx) => (
              <div
                key={idx}
                className={`schedule-exam-rule-item ${idx === 1 ? 'schedule-exam-rule-pill' : ''}`}
              >
                {rule}
              </div>
            ))}
          </div>
        </div>

        <div className="schedule-exam-actions">
          <button
            type="button"
            className="schedule-exam-cancel-btn"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="schedule-exam-submit-btn"
            onClick={handleSave}
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </BottomDrawer>
  );
}
