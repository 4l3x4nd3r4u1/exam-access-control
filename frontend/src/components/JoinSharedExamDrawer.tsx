import { useEffect, useMemo, useState } from 'react';
import { BottomDrawer } from './BottomDrawer';
import { courseService } from '../services/courseService';
import { sharedExamService } from '../services/sharedExamService';
import { formatExamType, formatTime } from '../utils/examFormat';
import type { TeacherCourse } from '../types/course';
import type { AvailableRoom } from '../types/exam';
import type { SharedExamItem } from '../types/sharedExam';

interface JoinSharedExamDrawerProps {
  isOpen: boolean;
  invitation: SharedExamItem | null;
  teacherId: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface ExtraRoomState {
  room_id?: number | string;
  room_name: string;
  max_capacity: number;
  assigned_capacity: number;
  is_manual?: boolean;
}

export function JoinSharedExamDrawer({
  isOpen,
  invitation,
  teacherId,
  onClose,
  onSuccess,
}: JoinSharedExamDrawerProps) {
  const [teacherCourses, setTeacherCourses] = useState<TeacherCourse[]>([]);
  const [selectedCourseGroupId, setSelectedCourseGroupId] = useState<number | ''>('');
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [extraRooms, setExtraRooms] = useState<ExtraRoomState[]>([]);

  // Room addition mode: 'AVAILABLE' or 'MANUAL'
  const [addMode, setAddMode] = useState<'AVAILABLE' | 'MANUAL'>('AVAILABLE');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [manualName, setManualName] = useState<string>('');
  const [assignedCap, setAssignedCap] = useState<number | ''>('');

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const exam = invitation?.exam;

  useEffect(() => {
    if (!isOpen || !invitation) {
      setSelectedCourseGroupId('');
      setExtraRooms([]);
      setErrorMessage(null);
      setSelectedRoomId('');
      setManualName('');
      setAssignedCap('');
      setAddMode('AVAILABLE');
      return;
    }

    setIsLoadingData(true);
    setErrorMessage(null);

    Promise.all([
      courseService.getTeacherCourses(teacherId, exam?.academic_term),
      sharedExamService.getAvailableRooms(invitation.shared_exam_id),
    ])
      .then(([courses, rooms]) => {
        const matchingCourses = courses.filter((c) => {
          const matchCode = exam?.subject_code && c.subject_code?.toUpperCase() === exam.subject_code.toUpperCase();
          const matchName = exam?.subject_name && c.subject_name?.toUpperCase() === exam.subject_name.toUpperCase();
          return matchCode || matchName;
        });

        const activeCourses = matchingCourses.length > 0 ? matchingCourses : courses;
        setTeacherCourses(activeCourses);

        if (invitation.invited_group?.course_group_id) {
          setSelectedCourseGroupId(Number(invitation.invited_group.course_group_id));
        } else if (activeCourses.length === 1) {
          setSelectedCourseGroupId(Number(activeCourses[0].course_group_id));
        }

        setAvailableRooms(rooms);
      })
      .catch((err) => {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Error al cargar los datos del examen compartido.',
        );
      })
      .finally(() => {
        setIsLoadingData(false);
      });
  }, [isOpen, invitation, teacherId, exam?.academic_term, exam?.subject_code, exam?.subject_name]);

  const selectedCourse = useMemo(() => {
    if (!selectedCourseGroupId) return null;
    return teacherCourses.find(
      (c) => Number(c.course_group_id) === Number(selectedCourseGroupId),
    );
  }, [selectedCourseGroupId, teacherCourses]);

  const enrolledCount = selectedCourse ? selectedCourse.total_enrolled : 0;
  const hostRemaining = exam ? exam.total_remaining_capacity : 0;
  const totalExtraCapacity = useMemo(() => {
    return extraRooms.reduce((acc, r) => acc + r.assigned_capacity, 0);
  }, [extraRooms]);

  const totalAssignedCapacity = hostRemaining + totalExtraCapacity;
  const missingCapacity = Math.max(0, enrolledCount - totalAssignedCapacity);

  const selectableRooms = useMemo(() => {
    const alreadyChosenIds = new Set(extraRooms.map((r) => String(r.room_id)));
    return availableRooms.filter((r) => !alreadyChosenIds.has(String(r.room_id)));
  }, [availableRooms, extraRooms]);

  const handleAddRoom = () => {
    if (addMode === 'AVAILABLE') {
      if (!selectedRoomId) return;

      const roomModel = availableRooms.find(
        (r) => String(r.room_id) === String(selectedRoomId),
      );
      if (!roomModel) return;

      const cap =
        assignedCap && Number(assignedCap) > 0
          ? Math.min(Number(assignedCap), roomModel.capacity)
          : Math.min(missingCapacity > 0 ? missingCapacity : roomModel.capacity, roomModel.capacity);

      setExtraRooms((prev) => [
        ...prev,
        {
          room_id: Number(roomModel.room_id),
          room_name: roomModel.room_name,
          max_capacity: roomModel.capacity,
          assigned_capacity: cap,
          is_manual: false,
        },
      ]);

      setSelectedRoomId('');
      setAssignedCap('');
    } else {
      const cleanName = manualName.trim();
      if (!cleanName) {
        setErrorMessage('Por favor ingresa el nombre del aula manual.');
        return;
      }

      const cap = assignedCap && Number(assignedCap) > 0 ? Number(assignedCap) : 40;

      const duplicate = extraRooms.some(
        (r) => r.room_name.trim().toLowerCase() === cleanName.toLowerCase(),
      );
      if (duplicate) {
        setErrorMessage('Ya agregaste un aula con ese nombre.');
        return;
      }

      setExtraRooms((prev) => [
        ...prev,
        {
          room_id: `manual-${Date.now()}`,
          room_name: cleanName,
          max_capacity: cap,
          assigned_capacity: cap,
          is_manual: true,
        },
      ]);

      setManualName('');
      setAssignedCap('');
      setErrorMessage(null);
    }
  };

  const handleRemoveExtraRoom = (index: number) => {
    setExtraRooms((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!invitation) return;

    if (!selectedCourseGroupId) {
      setErrorMessage('Por favor selecciona el grupo que participará en el examen.');
      return;
    }

    if (enrolledCount > 0 && missingCapacity > 0) {
      setErrorMessage(
        `Capacidad insuficiente: Tu grupo tiene ${enrolledCount} estudiantes, pero la capacidad total es ${totalAssignedCapacity}. Asigna aulas adicionales para cubrir los ${missingCapacity} cupos restantes.`,
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      await sharedExamService.updateAllocation(invitation.shared_exam_id, {
        course_group_id: Number(selectedCourseGroupId),
        rooms: extraRooms.map((r) => ({
          room_id: typeof r.room_id === 'number' ? r.room_id : undefined,
          room_name: r.room_name,
          assigned_capacity: r.assigned_capacity,
        })),
      });

      onSuccess();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Error al actualizar la asignación del examen compartido.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !invitation || !exam) {
    return null;
  }

  return (
    <BottomDrawer
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Gestionar Estudiantes y Aulas"
      className="schedule-exam-bottom-drawer"
    >
      <div className="schedule-exam-drawer-content se-organized-drawer" style={{ gap: '10px' }}>
        <header className="se-drawer-header" style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <span
                  style={{
                    background: '#e0f2fe',
                    color: '#0369a1',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    textTransform: 'uppercase',
                  }}
                >
                  {formatExamType(exam.exam_type)}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {exam.date} • {formatTime(exam.start_time)} - {formatTime(exam.end_time)}
                </span>
              </div>
              <h2 className="schedule-exam-title se-drawer-title" style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>
                {exam.subject_code} - {exam.subject_name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '1.25rem',
                lineHeight: 1,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.15s, background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#0f172a';
                e.currentTarget.style.backgroundColor = '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#64748b';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              ✕
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="se-alert-banner is-error" role="alert" style={{ marginBottom: '10px', fontSize: '0.82rem', padding: '8px 12px' }}>
            {errorMessage}
          </div>
        )}

        <div className="se-sections-stack" style={{ padding: '0 0 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* SECCIÓN: SELECCIÓN DE MI GRUPO */}
          <section className="se-card" style={{ padding: '12px 14px' }} aria-label="Selección de grupo">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label htmlFor="select-my-group" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>
                Tu Grupo Asignado:
              </label>
              {selectedCourse && (
                <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>
                  ✓ {enrolledCount} estudiantes inscritos
                </span>
              )}
            </div>

            <select
              id="select-my-group"
              className="schedule-exam-select se-full-select"
              value={selectedCourseGroupId}
              onChange={(e) => setSelectedCourseGroupId(e.target.value ? Number(e.target.value) : '')}
              disabled={isLoadingData || isSubmitting}
              style={{ fontSize: '0.86rem', padding: '7px 10px' }}
            >
              <option value="">Selecciona tu grupo...</option>
              {teacherCourses.map((c) => (
                <option key={c.course_group_id} value={c.course_group_id}>
                  Grupo {c.group_code} ({c.total_enrolled} estudiantes)
                </option>
              ))}
            </select>
          </section>

          {/* SECCIÓN: BALANCE DE CAPACIDAD Y AULAS ADICIONALES */}
          {selectedCourse && (
            <section className="se-card" style={{ padding: '12px 14px' }} aria-label="Capacidad y aulas adicionales">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 className="se-card-heading" style={{ fontSize: '0.86rem', margin: 0, fontWeight: 600 }}>
                  Balance de Capacidad
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: missingCapacity === 0 ? '#dcfce7' : '#fee2e2',
                    color: missingCapacity === 0 ? '#15803d' : '#b91c1c',
                  }}
                >
                  {missingCapacity === 0 ? '✓ Cupo Cubierto' : `Faltan ${missingCapacity} cupos`}
                </span>
              </div>

              {/* 4 MÉTRICAS COMPACTAS EN 1 LÍNEA */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '6px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 4px', borderRadius: '6px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Tus Alumnos</span>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{enrolledCount}</strong>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 4px', borderRadius: '6px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Cupo Anfitrión</span>
                  <strong style={{ fontSize: '0.95rem', color: '#16a34a' }}>{hostRemaining}</strong>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 4px', borderRadius: '6px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Aulas Extra</span>
                  <strong style={{ fontSize: '0.95rem', color: '#2563eb' }}>{totalExtraCapacity}</strong>
                </div>
                <div
                  style={{
                    background: missingCapacity === 0 ? '#f0fdf4' : '#fef2f2',
                    border: missingCapacity === 0 ? '1px solid #86efac' : '1px solid #fca5a5',
                    padding: '6px 4px',
                    borderRadius: '6px',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.68rem', color: missingCapacity === 0 ? '#16a34a' : '#dc2626', display: 'block' }}>
                    Asignado
                  </span>
                  <strong style={{ fontSize: '0.95rem', color: missingCapacity === 0 ? '#16a34a' : '#dc2626' }}>
                    {totalAssignedCapacity} / {enrolledCount}
                  </strong>
                </div>
              </div>

              {/* LISTA DE AULAS ADICIONALES (SI HAY) */}
              {extraRooms.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Aulas adicionales añadidas:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {extraRooms.map((extra, idx) => (
                      <div
                        key={`${extra.room_name}-${idx}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#0f172a' }}>{extra.room_name}</strong>
                          {extra.is_manual && (
                            <span style={{ fontSize: '0.66rem', color: '#4f46e5', background: '#e0e7ff', padding: '1px 5px', borderRadius: '3px', marginLeft: '6px' }}>
                              Manual
                            </span>
                          )}
                          <span style={{ color: '#64748b', marginLeft: '8px' }}>
                            Cupo: <strong>{extra.assigned_capacity}</strong>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveExtraRoom(idx)}
                          style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                          }}
                        >
                          ✕ Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FORMULARIO COMPACTO PARA AÑADIR AULA */}
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#334155' }}>
                    + Agregar Aula Adicional
                  </span>
                  <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: '6px', padding: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setAddMode('AVAILABLE')}
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: '4px',
                        background: addMode === 'AVAILABLE' ? '#fff' : 'transparent',
                        color: addMode === 'AVAILABLE' ? '#0f172a' : '#64748b',
                        boxShadow: addMode === 'AVAILABLE' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Aulas del Sistema
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddMode('MANUAL')}
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: '4px',
                        background: addMode === 'MANUAL' ? '#fff' : 'transparent',
                        color: addMode === 'MANUAL' ? '#0f172a' : '#64748b',
                        boxShadow: addMode === 'MANUAL' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      ✏️ Manual
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  {addMode === 'AVAILABLE' ? (
                    <div style={{ flex: '2 1 180px' }}>
                      <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                        Aula libre:
                      </label>
                      <select
                        className="schedule-exam-select"
                        style={{ width: '100%', fontSize: '0.8rem', padding: '5px 8px', height: '32px' }}
                        value={selectedRoomId}
                        onChange={(e) => setSelectedRoomId(e.target.value)}
                      >
                        <option value="">Selecciona aula...</option>
                        {selectableRooms.map((r) => (
                          <option key={r.room_id} value={r.room_id}>
                            {r.room_name} (Capacidad: {r.capacity})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div style={{ flex: '2 1 180px' }}>
                      <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                        Nombre aula manual:
                      </label>
                      <input
                        type="text"
                        className="schedule-exam-input"
                        style={{ width: '100%', fontSize: '0.8rem', padding: '5px 8px', height: '32px' }}
                        placeholder="Ej. Aula 692, Lab 3..."
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                      />
                    </div>
                  )}

                  <div style={{ flex: '1 1 70px' }}>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                      Cupo:
                    </label>
                    <input
                      type="number"
                      min={1}
                      className="schedule-exam-input"
                      style={{ width: '100%', fontSize: '0.8rem', padding: '5px 8px', height: '32px' }}
                      placeholder={missingCapacity > 0 ? String(missingCapacity) : '40'}
                      value={assignedCap}
                      onChange={(e) => setAssignedCap(e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>

                  <button
                    type="button"
                    className="schedule-exam-submit-btn"
                    style={{ width: 'auto', padding: '5px 12px', fontSize: '0.76rem', height: '32px' }}
                    onClick={handleAddRoom}
                    disabled={addMode === 'AVAILABLE' ? !selectedRoomId : !manualName.trim()}
                  >
                    + Añadir
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* ACCIONES DEL DRAWER STICKY AL FONDO */}
        <div className="schedule-exam-actions se-sticky-actions">
          <button
            type="button"
            className="schedule-exam-cancel-btn"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="schedule-exam-submit-btn"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedCourseGroupId || (enrolledCount > 0 && missingCapacity > 0)}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Asignación'}
          </button>
        </div>
      </div>
    </BottomDrawer>
  );
}
