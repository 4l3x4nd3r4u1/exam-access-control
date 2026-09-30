import { useRef, useState } from 'react';
import { BottomDrawer } from './BottomDrawer';
import type { TeacherCourse } from '../types/course';

interface TimeSlot {
  start: string;
  end: string;
}

const TIME_SLOTS: TimeSlot[] = [
  { start: '06:45 am', end: '08:15 am' },
  { start: '08:15 am', end: '09:45 am' },
  { start: '09:45 am', end: '11:15 am' },
  { start: '11:15 am', end: '12:45 pm' },
  { start: '12:45 pm', end: '02:15 pm' },
  { start: '02:15 pm', end: '03:45 pm' },
  { start: '03:45 pm', end: '05:15 pm' },
  { start: '05:15 pm', end: '06:45 pm' },
  { start: '06:45 pm', end: '08:15 pm' },
  { start: '08:15 pm', end: '09:45 pm' },
];

interface ClassroomOption {
  id: string;
  nombre: string;
  capacidad: number;
}

const AULAS_DISPONIBLES: ClassroomOption[] = [
  { id: '691A', nombre: 'Aula 691A', capacidad: 80 },
  { id: '691B', nombre: 'Aula 691B', capacidad: 80 },
  { id: '691C', nombre: 'Aula 691C', capacidad: 80 },
  { id: '691D', nombre: 'Aula 691D', capacidad: 80 },
  { id: '691E', nombre: 'Aula 691E', capacidad: 80 },
  { id: '691F', nombre: 'Aula 691F', capacidad: 80 },
  { id: 'Auditorio', nombre: 'Auditorio', capacidad: 120 },
];

export interface ScheduledExamData {
  tipoExamen: string;
  fecha: string;
  horaInicio: string;
  duracion: string;
  horaFin: string;
  aulas: string[];
  normas: string[];
}

interface ScheduleExamDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  course: TeacherCourse;
  onSaved?: (data: ScheduledExamData) => void;
}

function formatDateToSpanish(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  const formatted = date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function ScheduleExamDrawer({ isOpen, onClose, course, onSaved }: ScheduleExamDrawerProps) {
  const [examType, setExamType] = useState('Primer Parcial');
  const [rawDate, setRawDate] = useState('2026-09-24');
  const [startTimeIndex, setStartTimeIndex] = useState(0);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [isRoomsOpen, setIsRoomsOpen] = useState(false);
  const [rules, setRules] = useState<string[]>([]);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRuleText, setNewRuleText] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const dateInputRef = useRef<HTMLInputElement>(null);

  const currentSlot = TIME_SLOTS[startTimeIndex] || TIME_SLOTS[0];
  const enrolledCount = course?.total_enrolled ?? 184;

  const totalCapacity = selectedRoomIds.reduce((sum, id) => {
    const room = AULAS_DISPONIBLES.find((r) => r.id === id);
    return sum + (room?.capacidad ?? 0);
  }, 0);

  const roomsSummary = selectedRoomIds
    .map((id) => AULAS_DISPONIBLES.find((r) => r.id === id)?.nombre ?? id)
    .join(', ');

  const handleToggleRoom = (roomId: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId]
    );
  };

  const handleAddRule = () => {
    const cleanText = newRuleText.trim();
    if (!cleanText) return;
    setRules((prev) => [...prev, cleanText]);
    setNewRuleText('');
    setIsAddingRule(false);
  };

  const handleDeleteRule = (index: number) => {
    setRules((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    const examData: ScheduledExamData = {
      tipoExamen: examType,
      fecha: rawDate,
      horaInicio: currentSlot.start,
      duracion: '1h 30min',
      horaFin: currentSlot.end,
      aulas: selectedRoomIds,
      normas: rules,
    };

    setSaveSuccess(true);
    if (onSaved) {
      onSaved(examData);
    }

    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 500);
  };

  return (
    <BottomDrawer isOpen={isOpen} onClose={onClose} ariaLabel="Programar Examen">
      <div className="schedule-exam-drawer-content">
        <h2 className="schedule-exam-title">Programar Examen</h2>

        {/* 1. Tipo de Examen con desplegable */}
        <div className="schedule-exam-row">
          <label htmlFor="schedule-exam-type" className="schedule-exam-label">
            Tipo de Examen:
          </label>
          <div className="schedule-exam-select-wrapper">
            <select
              id="schedule-exam-type"
              className="schedule-exam-select"
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
            >
              <option value="Primer Parcial">Primer Parcial</option>
              <option value="Segundo Parcial">Segundo Parcial</option>
              <option value="Examen Final">Examen Final</option>
            </select>
          </div>
        </div>

        {/* 2. Fecha del Examen con calendario interactivo */}
        <div className="schedule-exam-section">
          <label htmlFor="schedule-exam-hidden-date" className="schedule-exam-label">
            Fecha:
          </label>
          <div
            className="schedule-exam-date-box"
            onClick={() => {
              if (dateInputRef.current) {
                if (typeof dateInputRef.current.showPicker === 'function') {
                  dateInputRef.current.showPicker();
                } else {
                  dateInputRef.current.focus();
                }
              }
            }}
          >
            <div className="schedule-exam-date-left">
              <svg viewBox="0 0 24 24" className="schedule-exam-calendar-icon" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="schedule-exam-date-text">{formatDateToSpanish(rawDate)}</span>
            </div>
            <span className="schedule-exam-chevron-circle" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="schedule-exam-chevron-icon" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
            <input
              ref={dateInputRef}
              id="schedule-exam-hidden-date"
              type="date"
              className="schedule-exam-hidden-date-input"
              value={rawDate}
              onChange={(e) => setRawDate(e.target.value)}
            />
          </div>
        </div>

        {/* 3. Horarios y Duración (Automático: +1h 30min, hasta 08:15 pm -> 09:45 pm) */}
        <div className="schedule-exam-times-block">
          <div className="schedule-exam-spread-row">
            <label htmlFor="schedule-exam-start-time" className="schedule-exam-label">
              Hora de inicio:
            </label>
            <div className="schedule-exam-select-wrapper">
              <select
                id="schedule-exam-start-time"
                className="schedule-exam-select"
                value={startTimeIndex}
                onChange={(e) => setStartTimeIndex(Number(e.target.value))}
              >
                {TIME_SLOTS.map((slot, idx) => (
                  <option key={slot.start} value={idx}>
                    {slot.start}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="schedule-exam-spread-row">
            <span className="schedule-exam-label">Duración</span>
            <span className="schedule-exam-value">1h 30min</span>
          </div>

          <div className="schedule-exam-spread-row">
            <span className="schedule-exam-label">Hora de finalización:</span>
            <span className="schedule-exam-value schedule-exam-calculated-time">
              {currentSlot.end}
            </span>
          </div>
        </div>

        {/* 4. Aulas con pestaña desplegable hacia abajo (sin capacidad entre paréntesis y ninguna seleccionada por defecto) */}
        <div className="schedule-exam-section">
          <button
            type="button"
            className="schedule-exam-spread-row schedule-exam-accordion-header"
            onClick={() => setIsRoomsOpen(!isRoomsOpen)}
            aria-expanded={isRoomsOpen}
          >
            <div className="schedule-exam-label-with-arrow">
              <span className="schedule-exam-label">Aulas:</span>
              <span className={`schedule-exam-arrow-indicator ${isRoomsOpen ? 'open' : ''}`} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#000" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>
            <span className="schedule-exam-value schedule-exam-aulas-summary">
              {roomsSummary || 'Ninguna seleccionada'}
            </span>
          </button>

          <p className="schedule-exam-subtext">
            {totalCapacity} plazas para {enrolledCount} inscritos
            {totalCapacity < enrolledCount && (
              <span className="schedule-exam-capacity-warning"> (Faltan {enrolledCount - totalCapacity} cupos)</span>
            )}
          </p>

          {isRoomsOpen && (
            <div className="schedule-exam-dropdown-panel" role="region" aria-label="Selección de aulas">
              <span className="schedule-exam-panel-tip">Selecciona las aulas para este examen:</span>
              <div className="schedule-exam-classrooms-grid">
                {AULAS_DISPONIBLES.map((room) => {
                  const isChecked = selectedRoomIds.includes(room.id);
                  return (
                    <button
                      key={room.id}
                      type="button"
                      className={`schedule-exam-room-pill ${isChecked ? 'selected' : ''}`}
                      onClick={() => handleToggleRoom(room.id)}
                    >
                      <span className="schedule-exam-room-check">{isChecked ? '✓' : '+'}</span>
                      <span className="schedule-exam-room-name">{room.nombre}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 5. Normas con botón (+) para insertar nuevas normas (ninguna por defecto) */}
        <div className="schedule-exam-section schedule-exam-rules-section">
          <div className="schedule-exam-spread-row">
            <span className="schedule-exam-label">Normas</span>
            <button
              type="button"
              className="schedule-exam-add-rule-btn"
              onClick={() => setIsAddingRule(!isAddingRule)}
              aria-label="Agregar norma"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {/* Formulario de nueva norma al pulsar (+) */}
          {isAddingRule && (
            <div className="schedule-exam-new-rule-box">
              <input
                type="text"
                className="schedule-exam-new-rule-input"
                placeholder="Escribe la nueva norma de evaluación..."
                value={newRuleText}
                onChange={(e) => setNewRuleText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRule();
                  }
                }}
                autoFocus
              />
              <div className="schedule-exam-new-rule-actions">
                <button
                  type="button"
                  className="schedule-exam-new-rule-cancel"
                  onClick={() => {
                    setIsAddingRule(false);
                    setNewRuleText('');
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="schedule-exam-new-rule-submit"
                  onClick={handleAddRule}
                >
                  Agregar
                </button>
              </div>
            </div>
          )}

          <div className="schedule-exam-rules-list">
            {rules.length === 0 ? (
              <p className="schedule-exam-empty-rules">No hay normas registradas. Presiona (+) para agregar una.</p>
            ) : (
              rules.map((rule, idx) => (
                <div
                  key={idx}
                  className={`schedule-exam-rule-item ${idx % 2 === 1 ? 'schedule-exam-rule-pill' : ''}`}
                >
                  <span>{rule}</span>
                  <button
                    type="button"
                    className="schedule-exam-rule-delete"
                    onClick={() => handleDeleteRule(idx)}
                    aria-label={`Eliminar norma ${rule}`}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Botones de acción */}
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
            {saveSuccess ? '¡Guardado!' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </BottomDrawer>
  );
}
