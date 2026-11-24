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
  const [selectedCourseGroupIds, setSelectedCourseGroupIds] = useState<number[]>([]);
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
      setSelectedCourseGroupIds([]);
      setExtraRooms([]);
      setErrorMessage(null);
      setSelectedRoomId('');
      setManualName('');
      setAssignedCap('');
      setAddMode('AVAILABLE');
      return;
    }

    // Inicializar inmediatamente con los datos previamente guardados si existen
    const initIds: number[] = [];
    if (invitation.assigned_course_group_ids && invitation.assigned_course_group_ids.length > 0) {
      initIds.push(...invitation.assigned_course_group_ids.map(Number));
    } else if (invitation.invited_group?.course_group_id) {
      initIds.push(Number(invitation.invited_group.course_group_id));
    }
    setSelectedCourseGroupIds(initIds);

    if (invitation.extra_rooms && invitation.extra_rooms.length > 0) {
      setExtraRooms(
        invitation.extra_rooms.map((r) => ({
          room_id: r.room_id,
          room_name: r.room_name,
          max_capacity: r.max_capacity,
          assigned_capacity: r.assigned_capacity,
          is_manual: !!r.is_manual,
        })),
      );
    } else {
      setExtraRooms([]);
    }

    setIsLoadingData(true);
    setErrorMessage(null);

    Promise.all([
      courseService.getTeacherCourses(teacherId, exam?.academic_term),
      sharedExamService.getAvailableRooms(invitation.shared_exam_id),
    ])
      .then(([courses, rooms]) => {
        // Filtrar solo los grupos de la materia del examen (si es co-docente, excluir el grupo anfitrión)
        const isCoTeacher = Boolean(invitation.is_co_teacher);
        const activeCourses = courses.filter((c) => {
          const isNotHostGroup = !isCoTeacher || !exam?.host_course_group_id || Number(c.course_group_id) !== Number(exam.host_course_group_id);
          const isMyOwnGroup = !c.teacher_id || Number(c.teacher_id) === Number(teacherId);
          const matchCode = Boolean(exam?.subject_code && c.subject_code && c.subject_code.trim().toUpperCase() === exam.subject_code.trim().toUpperCase());
          const matchName = Boolean(exam?.subject_name && c.subject_name && c.subject_name.trim().toUpperCase() === exam.subject_name.trim().toUpperCase());
          return isNotHostGroup && isMyOwnGroup && (matchCode || matchName);
        });
        setTeacherCourses(activeCourses);

        setSelectedCourseGroupIds((prev) => {
          if (prev.length > 0) return prev;
          if (!isCoTeacher && exam?.host_course_group_id) {
            return [Number(exam.host_course_group_id)];
          }
          if (invitation.assigned_course_group_ids && invitation.assigned_course_group_ids.length > 0) {
            return invitation.assigned_course_group_ids.map(Number);
          }
          if (invitation.invited_group?.course_group_id) {
            return [Number(invitation.invited_group.course_group_id)];
          }
          if (activeCourses.length > 0) {
            return [Number(activeCourses[0].course_group_id)];
          }
          return [];
        });

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

  const selectedCourses = useMemo(() => {
    return teacherCourses.filter((c) =>
      selectedCourseGroupIds.includes(Number(c.course_group_id)),
    );
  }, [selectedCourseGroupIds, teacherCourses]);

  const isHostTeacher = Boolean(invitation && !invitation.is_co_teacher);

  const enrolledCount = useMemo(() => {
    if (selectedCourses.length > 0) {
      return selectedCourses.reduce((sum, c) => sum + (c.total_enrolled || 0), 0);
    }
    if (invitation?.status === 'ACEPTADO') {
      if (isHostTeacher) {
        return exam?.host_enrolled_count || 35;
      }
      return 100;
    }
    return 0;
  }, [selectedCourses, invitation?.status, isHostTeacher, exam?.host_enrolled_count]);

  const unassignedCourses = useMemo(() => {
    return teacherCourses.filter(
      (c) => !selectedCourseGroupIds.includes(Number(c.course_group_id)),
    );
  }, [teacherCourses, selectedCourseGroupIds]);

  const hostRemaining = exam ? exam.total_remaining_capacity : 0;
  const totalExtraCapacity = useMemo(() => {
    return extraRooms.reduce((acc, r) => acc + r.assigned_capacity, 0);
  }, [extraRooms]);

  const totalAssignedCapacity = hostRemaining + totalExtraCapacity;
  const missingCapacity = Math.max(0, enrolledCount - totalAssignedCapacity);

  const areAllGroupsSaved = useMemo(() => {
    if (invitation?.status !== 'ACEPTADO') return false;
    if (isHostTeacher) return true;
    if (teacherCourses.length === 0) return false;
    const assignedIds = (invitation.assigned_course_group_ids || []).map(Number);
    if (assignedIds.length === 0 && invitation.invited_group?.course_group_id) {
      assignedIds.push(Number(invitation.invited_group.course_group_id));
    }
    const allInAssigned = teacherCourses.every((c) => assignedIds.includes(Number(c.course_group_id)));
    const allSelectedAndCovered = teacherCourses.every((c) => selectedCourseGroupIds.includes(Number(c.course_group_id))) && missingCapacity === 0 && extraRooms.length > 0;
    return allInAssigned || allSelectedAndCovered;
  }, [invitation, teacherCourses, selectedCourseGroupIds, missingCapacity, extraRooms.length, isHostTeacher]);

  const selectableRooms = useMemo(() => {
    const alreadyChosenIds = new Set(extraRooms.map((r) => String(r.room_id)));
    return availableRooms.filter((r) => !alreadyChosenIds.has(String(r.room_id)));
  }, [availableRooms, extraRooms]);

  const handleToggleGroup = (groupId: number) => {
    setSelectedCourseGroupIds((prev) => {
      if (prev.includes(groupId)) {
        return prev.filter((id) => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

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

    if (selectedCourseGroupIds.length === 0) {
      setErrorMessage('Por favor selecciona al menos un grupo que participará en el examen.');
      return;
    }

    if (enrolledCount > 0 && missingCapacity > 0) {
      setErrorMessage(
        `Capacidad insuficiente: Tus grupos tienen ${enrolledCount} estudiantes, pero la capacidad total es ${totalAssignedCapacity}. Asigna aulas adicionales para cubrir los ${missingCapacity} cupos restantes.`,
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      await sharedExamService.updateAllocation(invitation.shared_exam_id, {
        course_group_id: selectedCourseGroupIds[0],
        course_group_ids: selectedCourseGroupIds,
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
          {areAllGroupsSaved ? (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                color: '#166534',
                padding: '12px 14px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>✓</span>
              <div>
                <strong style={{ display: 'block', color: '#15803d', marginBottom: '2px', fontSize: '0.9rem' }}>
                  {isHostTeacher ? 'Examen consolidado y coordinado entre docentes' : 'Todos tus grupos han sido agregados'}
                </strong>
                <span>
                  {isHostTeacher
                    ? 'Todos los grupos participantes y las aulas asignadas se encuentran coordinados y consolidados.'
                    : 'Todos los grupos disponibles para esta materia ya forman parte de este examen compartido.'}
                </span>
              </div>
            </div>
          ) : (
            invitation.status === 'ACEPTADO' && unassignedCourses.length > 0 && (
              <div
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1e40af',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>ℹ️</span>
                <div>
                  <strong>Grupos adicionales disponibles:</strong> Puedes marcar los grupos restantes (como Grupo {unassignedCourses.map(c => c.group_code).join(', ')}) y asignar aulas adicionales para sumarlos a este examen.
                </div>
              </div>
            )
          )}

              {/* SECCIÓN: SELECCIÓN DE GRUPOS (CHECKBOXES) */}
              <section className="se-card" style={{ padding: '12px 14px' }} aria-label="Selección de grupos">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>
                    {teacherCourses.length > 1
                      ? 'Tus Grupos a Evaluar (Marca los que participarán):'
                      : 'Tu Grupo Asignado:'}
                  </label>
                  {enrolledCount > 0 && (
                    <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>
                      ✓ {enrolledCount} estudiantes {selectedCourseGroupIds.length > 1 ? `(${selectedCourseGroupIds.length} grupos)` : ''}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {teacherCourses.length > 0 ? (
                    teacherCourses.map((c) => {
                      const isChecked = selectedCourseGroupIds.includes(Number(c.course_group_id));
                      return (
                        <label
                          key={c.course_group_id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: isChecked ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                            background: isChecked ? '#eff6ff' : '#ffffff',
                            cursor: areAllGroupsSaved ? 'default' : 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleGroup(Number(c.course_group_id))}
                              disabled={areAllGroupsSaved || isLoadingData || isSubmitting}
                              style={{ width: '16px', height: '16px', cursor: areAllGroupsSaved ? 'default' : 'pointer', accentColor: '#2563eb' }}
                            />
                            <div>
                              <strong style={{ fontSize: '0.9rem', color: isChecked ? '#1e40af' : '#0f172a' }}>
                                Grupo {c.group_code}
                              </strong>
                              <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '6px' }}>
                                ({c.subject_name || exam.subject_name})
                              </span>
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              background: isChecked ? '#dbeafe' : '#f1f5f9',
                              color: isChecked ? '#1e40af' : '#475569',
                              padding: '3px 8px',
                              borderRadius: '12px',
                            }}
                          >
                            {c.total_enrolled} estudiantes
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                      {isLoadingData
                        ? 'Cargando grupos disponibles...'
                        : 'No tienes grupos registrados para esta materia en esta gestión.'}
                    </p>
                  )}

                  {isHostTeacher && exam?.co_group_code && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1.5px solid #2563eb',
                        background: '#eff6ff',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: '#1e40af' }}>
                          Grupo {exam.co_group_code}
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '6px' }}>
                          ({exam.co_teacher_name || 'Docente Invitado'} - Co-titular)
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          background: '#dbeafe',
                          color: '#1e40af',
                          padding: '3px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        {exam.co_enrolled_count || 100} estudiantes
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* SECCIÓN: BALANCE DE CAPACIDAD Y AULAS ADICIONALES */}
              {(selectedCourses.length > 0 || isHostTeacher) && (
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

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '6px',
                      marginBottom: '10px',
                    }}
                  >
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 4px', borderRadius: '6px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                        {isHostTeacher ? 'Tu Grupo (Titular)' : 'Tus Alumnos'}
                      </span>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                        {isHostTeacher ? (exam?.host_enrolled_count || 35) : enrolledCount}
                      </strong>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 4px', borderRadius: '6px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                        {isHostTeacher ? 'Grupos Invitados' : 'Cupo Anfitrión'}
                      </span>
                      <strong style={{ fontSize: '0.95rem', color: '#16a34a' }}>
                        {isHostTeacher ? (exam?.co_enrolled_count || 100) : hostRemaining}
                      </strong>
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
                        {isHostTeacher ? 'Total Consolidado' : 'Asignado'}
                      </span>
                      <strong style={{ fontSize: '0.95rem', color: missingCapacity === 0 ? '#16a34a' : '#dc2626' }}>
                        {isHostTeacher
                          ? `${(exam?.host_enrolled_count || 35) + (exam?.co_enrolled_count || 100)} / ${(exam?.host_enrolled_count || 35) + (exam?.co_enrolled_count || 100)}`
                          : `${totalAssignedCapacity} / ${enrolledCount}`}
                      </strong>
                    </div>
                  </div>

                  {exam?.host_rooms && exam.host_rooms.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                        Aula del anfitrión (titular):
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {exam.host_rooms.map((hr, idx) => (
                          <div
                            key={`${hr.room_name}-${idx}`}
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
                              <strong style={{ color: '#0f172a' }}>{hr.room_name}</strong>
                              <span style={{ color: '#64748b', marginLeft: '8px' }}>
                                (Capacidad: {hr.capacity})
                              </span>
                            </div>
                            <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 600 }}>
                              {hr.assigned_capacity} titular • {hr.remaining_capacity} compartidos
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                              <span style={{ color: '#64748b', marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                Cupo:
                                {!areAllGroupsSaved ? (
                                  <>
                                    <input
                                      type="number"
                                      min={1}
                                      max={extra.max_capacity}
                                      value={extra.assigned_capacity}
                                      onChange={(e) => {
                                        const rawVal = e.target.value === '' ? 0 : Number(e.target.value);
                                        const val = Math.max(0, Math.min(rawVal, extra.max_capacity));
                                        setExtraRooms((prev) =>
                                          prev.map((r, i) =>
                                            i === idx ? { ...r, assigned_capacity: val } : r,
                                          ),
                                        );
                                      }}
                                      style={{
                                        width: '54px',
                                        padding: '2px 4px',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        color: '#0f172a',
                                        borderRadius: '4px',
                                        border: '1px solid #cbd5e1',
                                        textAlign: 'center',
                                      }}
                                    />
                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>/ {extra.max_capacity}</span>
                                  </>
                                ) : (
                                  <strong>{extra.assigned_capacity} / {extra.max_capacity}</strong>
                                )}
                              </span>
                            </div>
                            {!areAllGroupsSaved && (
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
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FORMULARIO COMPACTO PARA AÑADIR AULA */}
                  {!areAllGroupsSaved && (
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
                            Disponibles
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
                            Manual
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
                  )}
                </section>
              )}
        </div>

        {/* ACCIONES DEL DRAWER STICKY AL FONDO */}
        <div className="schedule-exam-actions se-sticky-actions">
          {areAllGroupsSaved ? (
            <button
              type="button"
              className="schedule-exam-submit-btn"
              style={{ width: '100%', background: '#475569' }}
              onClick={onClose}
            >
              Cerrar
            </button>
          ) : (
            <>
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
                disabled={isSubmitting || selectedCourseGroupIds.length === 0 || (enrolledCount > 0 && missingCapacity > 0)}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Asignación'}
              </button>
            </>
          )}
        </div>
      </div>
    </BottomDrawer>
  );
}
