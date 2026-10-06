import { useEffect, useMemo, useState } from 'react';
import { BottomDrawer } from './BottomDrawer';
import { examService } from '../services/examService';
import { courseService } from '../services/courseService';
import { catalogService, type CourseGroupCatalogItem } from '../services/catalogService';
import type { TeacherCourse, EnrolledStudent } from '../types/course';
import type { UserSession } from '../types/auth';
import type { AvailableRoom, ScheduleExamPayload } from '../types/exam';

interface TimeSlot {
  start: string;
  end: string;
  start24h: string;
}

const TIME_SLOTS: TimeSlot[] = [
  { start: '06:45 am', end: '08:15 am', start24h: '06:45' },
  { start: '08:15 am', end: '09:45 am', start24h: '08:15' },
  { start: '09:45 am', end: '11:15 am', start24h: '09:45' },
  { start: '11:15 am', end: '12:45 pm', start24h: '11:15' },
  { start: '12:45 pm', end: '02:15 pm', start24h: '12:45' },
  { start: '02:15 pm', end: '03:45 pm', start24h: '14:15' },
  { start: '03:45 pm', end: '05:15 pm', start24h: '15:45' },
  { start: '05:15 pm', end: '06:45 pm', start24h: '17:15' },
  { start: '06:45 pm', end: '08:15 pm', start24h: '18:45' },
  { start: '08:15 pm', end: '09:45 pm', start24h: '20:15' },
];

const DEFAULT_EXAM_TYPES = [
  { id: 1, nombre: 'Primer Parcial' },
  { id: 2, nombre: 'Segundo Parcial' },
  { id: 3, nombre: 'Examen Final' },
  { id: 4, nombre: 'Segunda Instancia' },
  { id: 5, nombre: 'Examen de Mesa' },
];

const FALLBACK_ROOMS: AvailableRoom[] = [
  { room_id: 3, room_name: 'Auditorio', capacity: 200 },
  { room_id: 2, room_name: 'Aula 691B', capacity: 80 },
  { room_id: 1, room_name: 'Aula 691A', capacity: 50 },
];

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
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

export interface ParticularRule {
  studentId: number;
  codigoSis: string;
  rule: string;
}

interface ScheduleExamDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  course?: TeacherCourse;
  session?: UserSession | null;
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

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function ScheduleExamDrawer({ isOpen, onClose, course, session, onSaved }: ScheduleExamDrawerProps) {
  // Course and group selection
  const [courseGroups, setCourseGroups] = useState<CourseGroupCatalogItem[]>([]);
  const [selectedCourseGroupId, setSelectedCourseGroupId] = useState<string>(
    course ? String(course.course_group_id) : ''
  );
  const [selectedSubjectKey, setSelectedSubjectKey] = useState<string>('');
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);

  // Exam configuration
  const [examTypes, setExamTypes] = useState(DEFAULT_EXAM_TYPES);
  const [selectedExamTypeId, setSelectedExamTypeId] = useState<number>(1);
  const [rawDate, setRawDate] = useState(getTodayDateString);
  const [startTimeIndex, setStartTimeIndex] = useState(0);

  // Calendar interactive popover state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());


  // Classrooms
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>(FALLBACK_ROOMS);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Array<string | number>>([]);
  const [isRoomsOpen, setIsRoomsOpen] = useState(false);

  // General Rules (empty by default)
  const [generalRules, setGeneralRules] = useState<string[]>([]);
  const [isAddingGeneralRule, setIsAddingGeneralRule] = useState(false);
  const [newGeneralRuleText, setNewGeneralRuleText] = useState('');

  // Particular Rules
  const [particularRules, setParticularRules] = useState<ParticularRule[]>([]);
  const [isAddingParticular, setIsAddingParticular] = useState(false);
  const [particularSis, setParticularSis] = useState('');
  const [particularRuleText, setParticularRuleText] = useState('');
  const [particularError, setParticularError] = useState<string | null>(null);
  const [isCheckingStudent, setIsCheckingStudent] = useState(false);

  // Submission feedback
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Toggle calendar and sync view with current rawDate
  const handleToggleCalendar = () => {
    setIsCalendarOpen((prev) => {
      if (!prev && rawDate) {
        const [y, m] = rawDate.split('-').map(Number);
        if (!isNaN(y) && !isNaN(m)) {
          setCalendarYear(y);
          setCalendarMonth(m - 1);
        }
      }
      return !prev;
    });
  };

  // Load available course groups if course prop is not provided
  useEffect(() => {
    if (!isOpen) return;

    // Fetch catalog exam types
    examService.getExamTypes().then((types) => {
      if (types && types.length > 0) {
        setExamTypes(
          types.map((t) => ({
            id: Number(t.value),
            nombre: t.label
              .toLowerCase()
              .split(' ')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' '),
          }))
        );
      }
    });

    if (!course) {
      catalogService.getCourseGroups().then((groups) => {
        if (groups && groups.length > 0) {
          setCourseGroups(groups);
          if (!selectedCourseGroupId) {
            const first = groups[0];
            setSelectedSubjectKey(first.sigla || first.course_name);
            setSelectedCourseGroupId(String(first.course_group_id));
          }
        } else if (session?.user_id) {
          courseService.getTeacherCourses(session.user_id).then((teacherCourses) => {
            if (teacherCourses && teacherCourses.length > 0) {
              const mapped: CourseGroupCatalogItem[] = teacherCourses.map((tc) => ({
                value: String(tc.course_group_id),
                label: `${tc.subject_name} - Grupo ${tc.group_code}`,
                course_group_id: String(tc.course_group_id),
                sigla: tc.subject_code,
                course_name: tc.subject_name,
                group_code: tc.group_code,
                gestion: tc.academic_term,
                teacher_id: tc.teacher_id,
              }));
              setCourseGroups(mapped);
              if (!selectedCourseGroupId) {
                const first = mapped[0];
                setSelectedSubjectKey(first.sigla || first.course_name);
                setSelectedCourseGroupId(String(first.course_group_id));
              }
            }
          });
        }
      });
    }
  }, [isOpen, course, session, selectedCourseGroupId]);

  // Unique subjects and groups for separated dropdowns
  const uniqueSubjects = useMemo(() => {
    const map = new Map<string, { key: string; name: string }>();
    for (const cg of courseGroups) {
      const key = cg.sigla || cg.course_name;
      if (!map.has(key)) {
        map.set(key, { key, name: cg.course_name });
      }
    }
    return Array.from(map.values());
  }, [courseGroups]);

  const availableGroupsForSubject = useMemo(() => {
    if (!selectedSubjectKey) return courseGroups;
    return courseGroups.filter(
      (cg) => (cg.sigla || cg.course_name) === selectedSubjectKey
    );
  }, [courseGroups, selectedSubjectKey]);

  const handleSubjectChange = (newSubjectKey: string) => {
    setSelectedSubjectKey(newSubjectKey);
    const groupsForNew = courseGroups.filter(
      (cg) => (cg.sigla || cg.course_name) === newSubjectKey
    );
    if (groupsForNew.length > 0) {
      setSelectedCourseGroupId(String(groupsForNew[0].course_group_id));
    }
  };

  // Active course info
  const activeCourseGroupId = course ? String(course.course_group_id) : selectedCourseGroupId;

  // Load enrolled students whenever activeCourseGroupId changes
  useEffect(() => {
    if (!isOpen || !activeCourseGroupId) return;

    let isMounted = true;
    courseService
      .getEnrolledStudents(activeCourseGroupId)
      .then((students) => {
        if (isMounted) {
          setEnrolledStudents(students || []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setEnrolledStudents([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeCourseGroupId]);

  // Load available rooms whenever date or startTimeIndex changes
  const currentSlot = TIME_SLOTS[startTimeIndex] || TIME_SLOTS[0];
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    examService
      .getAvailableRooms(rawDate, currentSlot.start24h)
      .then((rooms) => {
        if (isMounted && rooms && rooms.length > 0) {
          setAvailableRooms(rooms);
        } else if (isMounted) {
          setAvailableRooms(FALLBACK_ROOMS);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAvailableRooms(FALLBACK_ROOMS);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, rawDate, currentSlot.start24h]);

  const totalEnrolled = enrolledStudents.length > 0 ? enrolledStudents.length : (course?.total_enrolled ?? 0);

  // Selected rooms objects sorted by capacity descending (Auditorio [200] -> Aula 691B [80] -> Aula 691A [50])
  const selectedRooms = useMemo(() => {
    return availableRooms
      .filter((r) => selectedRoomIds.includes(r.room_id) || selectedRoomIds.includes(String(r.room_id)) || selectedRoomIds.includes(Number(r.room_id)))
      .sort((a, b) => b.capacity - a.capacity);
  }, [availableRooms, selectedRoomIds]);

  const totalCapacity = useMemo(() => {
    return selectedRooms.reduce((sum, r) => sum + r.capacity, 0);
  }, [selectedRooms]);

  // Distribute enrolled students across selected rooms according to capacities
  const roomAllocations = useMemo(() => {
    let remainingCount = totalEnrolled;
    const allocations: Array<{ room: AvailableRoom; studentCount: number; studentUserIds: number[] }> = [];

    for (const room of selectedRooms) {
      const count = Math.min(room.capacity, remainingCount);
      remainingCount = Math.max(0, remainingCount - count);
      allocations.push({
        room,
        studentCount: count,
        studentUserIds: [],
      });
    }

    let studentOffset = 0;
    for (const alloc of allocations) {
      const slice = enrolledStudents.slice(studentOffset, studentOffset + alloc.studentCount);
      alloc.studentUserIds = slice.map((s) => s.userId);
      studentOffset += alloc.studentCount;
    }

    return allocations;
  }, [selectedRooms, totalEnrolled, enrolledStudents]);

  // Distribution summary string: "{count} alumnos en {room_name}"
  const distributionSummary = useMemo(() => {
    if (roomAllocations.length === 0) return '';
    return roomAllocations
      .map((alloc) => `${alloc.studentCount} alumnos en ${alloc.room.room_name}`)
      .join(', ');
  }, [roomAllocations]);

  const roomsSummary = useMemo(() => {
    return selectedRooms.map((r) => r.room_name).join(', ');
  }, [selectedRooms]);

  const handleToggleRoom = (roomId: string | number) => {
    setSelectedRoomIds((prev) => {
      const isAlready = prev.includes(roomId) || prev.includes(String(roomId)) || prev.includes(Number(roomId));
      if (isAlready) {
        return prev.filter((id) => id !== roomId && String(id) !== String(roomId));
      }
      return [...prev, roomId];
    });
  };

  // Calendar event handlers
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const formatted = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setRawDate(formatted);
    setIsCalendarOpen(false);
  };

  // General Rules handlers
  const handleAddGeneralRule = () => {
    const cleanText = newGeneralRuleText.trim();
    if (!cleanText) return;
    setGeneralRules((prev) => [...prev, cleanText]);
    setNewGeneralRuleText('');
    setIsAddingGeneralRule(false);
  };

  const handleDeleteGeneralRule = (index: number) => {
    setGeneralRules((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Particular Rules handlers
  const handleVerifyAndAddParticularRule = async () => {
    const sis = particularSis.trim();
    const rule = particularRuleText.trim();

    if (!sis) {
      setParticularError('Por favor ingresa el código SIS del estudiante.');
      return;
    }

    if (!rule) {
      setParticularError('Por favor ingresa la norma particular.');
      return;
    }

    if (!activeCourseGroupId) {
      setParticularError('Por favor selecciona una materia y grupo.');
      return;
    }

    setIsCheckingStudent(true);
    setParticularError(null);

    try {
      const checkRes = await examService.checkStudentEnrollment(activeCourseGroupId, sis);
      if (!checkRes.success || !checkRes.data) {
        setParticularError('Si no pertenece a esa materia_grupo, entonces no puede poner normas particulares');
        return;
      }

      setParticularRules((prev) => [
        ...prev,
        {
          studentId: checkRes.data!.user_id,
          codigoSis: sis,
          rule,
        },
      ]);

      setParticularSis('');
      setParticularRuleText('');
      setIsAddingParticular(false);
    } catch {
      setParticularError('Si no pertenece a esa materia_grupo, entonces no puede poner normas particulares');
    } finally {
      setIsCheckingStudent(false);
    }
  };

  const handleDeleteParticularRule = (index: number) => {
    setParticularRules((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Save / Submit exam
  const handleSave = async () => {
    if (!activeCourseGroupId) {
      setErrorMessage('Por favor selecciona una materia y grupo.');
      return;
    }

    if (selectedRooms.length === 0) {
      setErrorMessage('Debes seleccionar al menos un aula para el examen.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Build room payloads with student user IDs
    const roomsPayload = roomAllocations.map((alloc) => {
      const studentIds = [...alloc.studentUserIds];
      return {
        roomId: Number(alloc.room.room_id),
        students: studentIds,
        auxiliarId: null,
      };
    });

    // Ensure students with particular rules are assigned so the backend finds them
    for (const pr of particularRules) {
      const isAssigned = roomsPayload.some((r) => r.students.includes(pr.studentId));
      if (!isAssigned && roomsPayload.length > 0) {
        roomsPayload[0].students.push(pr.studentId);
      }
    }

    const payload: ScheduleExamPayload = {
      examTypeId: selectedExamTypeId,
      date: rawDate,
      startTime: currentSlot.start24h,
      rooms: roomsPayload,
      generalRules,
      studentRules: particularRules.map((pr) => ({
        studentId: pr.studentId,
        rule: pr.rule,
      })),
    };

    try {
      await examService.scheduleExam(activeCourseGroupId, payload);

      setSaveSuccess(true);
      if (onSaved) {
        onSaved({
          tipoExamen: examTypes.find((t) => t.id === selectedExamTypeId)?.nombre || 'Primer Parcial',
          fecha: rawDate,
          horaInicio: currentSlot.start,
          duracion: '1h 30min',
          horaFin: currentSlot.end,
          aulas: selectedRooms.map((r) => r.room_name),
          normas: generalRules,
        });
      }

      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al guardar el examen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomDrawer isOpen={isOpen} onClose={onClose} ariaLabel="Programar Examen" className="schedule-exam-bottom-drawer">
      <div className="schedule-exam-drawer-content">
        <h2 className="schedule-exam-title">Programar Examen</h2>

        {/* 1. Materia y Grupo */}
        {course ? (
          <>
            <div className="schedule-exam-spread-row schedule-exam-info-row">
              <span className="schedule-exam-label">Materia:</span>
              <span className="schedule-exam-value">{course.subject_name}</span>
            </div>
            <div className="schedule-exam-spread-row schedule-exam-info-row">
              <span className="schedule-exam-label">Grupo:</span>
              <span className="schedule-exam-value">{course.group_code}</span>
            </div>
          </>
        ) : (
          <>
            <div className="schedule-exam-spread-row schedule-exam-info-row">
              <label htmlFor="schedule-exam-subject-select" className="schedule-exam-label">
                Materia:
              </label>
              <div className="schedule-exam-select-wrapper">
                <select
                  id="schedule-exam-subject-select"
                  className="schedule-exam-select"
                  value={selectedSubjectKey}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                >
                  {uniqueSubjects.length === 0 ? (
                    <option value="">Cargando materias...</option>
                  ) : (
                    uniqueSubjects.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="schedule-exam-spread-row schedule-exam-info-row">
              <label htmlFor="schedule-exam-group-select" className="schedule-exam-label">
                Grupo:
              </label>
              <div className="schedule-exam-select-wrapper">
                <select
                  id="schedule-exam-group-select"
                  className="schedule-exam-select"
                  value={selectedCourseGroupId}
                  onChange={(e) => setSelectedCourseGroupId(e.target.value)}
                >
                  {availableGroupsForSubject.length === 0 ? (
                    <option value="">Sin grupos</option>
                  ) : (
                    availableGroupsForSubject.map((cg) => (
                      <option key={cg.course_group_id} value={cg.course_group_id}>
                        {cg.group_code}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </>
        )}

        {/* 2. Tipo de Examen (5 opciones de la base de datos) */}
        <div className="schedule-exam-spread-row schedule-exam-info-row">
          <label htmlFor="schedule-exam-type" className="schedule-exam-label">
            Tipo de Examen:
          </label>
          <div className="schedule-exam-select-wrapper">
            <select
              id="schedule-exam-type"
              className="schedule-exam-select"
              value={selectedExamTypeId}
              onChange={(e) => setSelectedExamTypeId(Number(e.target.value))}
            >
              {examTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Fecha con calendario interactivo desplegable con toggle bidireccional */}
        <div className="schedule-exam-section">
          <label htmlFor="schedule-exam-date-trigger" className="schedule-exam-label">
            Fecha:
          </label>
          <button
            id="schedule-exam-date-trigger"
            type="button"
            className="schedule-exam-date-box"
            onClick={handleToggleCalendar}
            aria-expanded={isCalendarOpen}
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
              <svg viewBox="0 0 24 24" className={`schedule-exam-chevron-icon ${isCalendarOpen ? 'open' : ''}`} aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>

          {/* Selector de calendario desplegable */}
          {isCalendarOpen && (
            <div className="schedule-exam-calendar-popover" role="region" aria-label="Selector de calendario interactivo">
              <div className="schedule-exam-calendar-header">
                <button
                  type="button"
                  className="schedule-exam-calendar-nav-btn"
                  onClick={handlePrevMonth}
                  aria-label="Mes anterior"
                >
                  ‹
                </button>
                <span className="schedule-exam-calendar-month-title">
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </span>
                <button
                  type="button"
                  className="schedule-exam-calendar-nav-btn"
                  onClick={handleNextMonth}
                  aria-label="Mes siguiente"
                >
                  ›
                </button>
              </div>

              <div className="schedule-exam-calendar-weekdays">
                {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map((d) => (
                  <span key={d} className="schedule-exam-calendar-weekday">{d}</span>
                ))}
              </div>

              <div className="schedule-exam-calendar-days">
                {Array.from({ length: getFirstDayOfWeek(calendarYear, calendarMonth) }).map((_, i) => (
                  <span key={`empty-${i}`} className="schedule-exam-calendar-day empty" />
                ))}
                {Array.from({ length: getDaysInMonth(calendarYear, calendarMonth) }).map((_, i) => {
                  const dayNumber = i + 1;
                  const [curY, curM, curD] = rawDate.split('-').map(Number);
                  const isSelected = curY === calendarYear && curM === calendarMonth + 1 && curD === dayNumber;
                  return (
                    <button
                      key={dayNumber}
                      type="button"
                      className={`schedule-exam-calendar-day ${isSelected ? 'selected' : ''}`}
                      onClick={(e) => handleSelectDay(dayNumber, e)}
                    >
                      {dayNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 4. Horarios y Duración (Automático: +1h 30min) */}
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

        {/* 5. Aulas y Distribución de cupos */}
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

          {/* Resumen de distribución: "{count} alumnos en {room_name}" */}
          {distributionSummary && (
            <p className="schedule-exam-distribution-text">
              {distributionSummary}
            </p>
          )}

          <p className="schedule-exam-subtext">
            {totalCapacity} plazas para {totalEnrolled} inscritos
            {totalCapacity < totalEnrolled && (
              <span className="schedule-exam-capacity-warning"> (Faltan {totalEnrolled - totalCapacity} cupos)</span>
            )}
          </p>

          {isRoomsOpen && (
            <div className="schedule-exam-dropdown-panel" role="region" aria-label="Selección de aulas">
              <span className="schedule-exam-panel-tip">Selecciona las aulas para este examen:</span>
              <div className="schedule-exam-classrooms-grid">
                {availableRooms.map((room) => {
                  const isChecked = selectedRoomIds.includes(room.room_id) || selectedRoomIds.includes(String(room.room_id)) || selectedRoomIds.includes(Number(room.room_id));
                  return (
                    <button
                      key={room.room_id}
                      type="button"
                      className={`schedule-exam-room-pill ${isChecked ? 'selected' : ''}`}
                      onClick={() => handleToggleRoom(room.room_id)}
                    >
                      <span className="schedule-exam-room-check">{isChecked ? '✓' : '+'}</span>
                      <span className="schedule-exam-room-name">{room.room_name}</span>
                      <span className="schedule-exam-room-cap">({room.capacity})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 6. Normas Generales con botón (+) - Sin normas predeterminadas */}
        <div className="schedule-exam-section schedule-exam-rules-section">
          <div className="schedule-exam-spread-row">
            <span className="schedule-exam-label schedule-exam-bold-label">Normas generales</span>
            <button
              type="button"
              className="schedule-exam-add-rule-btn"
              onClick={() => setIsAddingGeneralRule(!isAddingGeneralRule)}
              aria-label="Agregar norma general"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {isAddingGeneralRule && (
            <div className="schedule-exam-new-rule-box">
              <input
                type="text"
                className="schedule-exam-new-rule-input"
                placeholder="Escribe la nueva norma general..."
                value={newGeneralRuleText}
                onChange={(e) => setNewGeneralRuleText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddGeneralRule();
                  }
                }}
                autoFocus
              />
              <div className="schedule-exam-new-rule-actions">
                <button
                  type="button"
                  className="schedule-exam-new-rule-cancel"
                  onClick={() => {
                    setIsAddingGeneralRule(false);
                    setNewGeneralRuleText('');
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="schedule-exam-new-rule-submit"
                  onClick={handleAddGeneralRule}
                >
                  Agregar
                </button>
              </div>
            </div>
          )}

          <div className="schedule-exam-rules-list">
            {generalRules.length === 0 ? (
              <p className="schedule-exam-empty-rules">
                No hay normas generales agregadas. Presiona (+) para agregar una.
              </p>
            ) : (
              generalRules.map((rule, idx) => (
                <div
                  key={idx}
                  className={`schedule-exam-rule-item ${idx % 2 === 1 ? 'schedule-exam-rule-pill' : ''}`}
                >
                  <span>{rule}</span>
                  <button
                    type="button"
                    className="schedule-exam-rule-delete"
                    onClick={() => handleDeleteGeneralRule(idx)}
                    aria-label={`Eliminar norma ${rule}`}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 7. Normas Particulares con verificación de inscripción SIS */}
        <div className="schedule-exam-section schedule-exam-rules-section">
          <div className="schedule-exam-spread-row">
            <span className="schedule-exam-label schedule-exam-bold-label">Normas particulares</span>
            <button
              type="button"
              className="schedule-exam-add-rule-btn"
              onClick={() => {
                setIsAddingParticular(!isAddingParticular);
                setParticularError(null);
              }}
              aria-label="Agregar norma particular"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {/* Formulario de nueva norma particular (Frame 39 & 40) */}
          {isAddingParticular && (
            <div className="schedule-exam-particular-form">
              <div className="schedule-exam-input-card">
                <label htmlFor="particular-student-input" className="schedule-exam-input-card-label">
                  Estudiante
                </label>
                <input
                  id="particular-student-input"
                  type="text"
                  className="schedule-exam-input-card-input"
                  placeholder="201803202"
                  value={particularSis}
                  onChange={(e) => {
                    setParticularSis(e.target.value);
                    setParticularError(null);
                  }}
                />
              </div>

              <div className="schedule-exam-input-card">
                <label htmlFor="particular-rule-input" className="schedule-exam-input-card-label">
                  Norma
                </label>
                <input
                  id="particular-rule-input"
                  type="text"
                  className="schedule-exam-input-card-input"
                  placeholder="Alguna norma particular para 201"
                  value={particularRuleText}
                  onChange={(e) => {
                    setParticularRuleText(e.target.value);
                    setParticularError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleVerifyAndAddParticularRule();
                    }
                  }}
                />
              </div>

              {particularError && (
                <p className="schedule-exam-particular-error-msg">
                  {particularError}
                </p>
              )}

              <div className="schedule-exam-particular-actions">
                <button
                  type="button"
                  className="schedule-exam-particular-cancel-btn"
                  onClick={() => {
                    setIsAddingParticular(false);
                    setParticularSis('');
                    setParticularRuleText('');
                    setParticularError(null);
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="schedule-exam-particular-submit-btn"
                  disabled={isCheckingStudent}
                  onClick={handleVerifyAndAddParticularRule}
                >
                  {isCheckingStudent ? 'Verificando...' : 'Agregar'}
                </button>
              </div>
            </div>
          )}

          {/* Listado de normas particulares agregadas */}
          <div className="schedule-exam-particular-list">
            {particularRules.map((item, idx) => (
              <div key={idx} className="schedule-exam-particular-card">
                <div className="schedule-exam-particular-card-content">
                  <div className="schedule-exam-particular-field">
                    <span className="schedule-exam-input-card-label">Estudiante</span>
                    <span className="schedule-exam-particular-val">{item.codigoSis}</span>
                  </div>
                  <div className="schedule-exam-particular-field">
                    <span className="schedule-exam-input-card-label">Norma</span>
                    <span className="schedule-exam-particular-val">{item.rule}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="schedule-exam-rule-delete"
                  onClick={() => handleDeleteParticularRule(idx)}
                  aria-label={`Eliminar norma particular para ${item.codigoSis}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {errorMessage && (
          <p className="schedule-exam-error" style={{ color: '#d93025', fontSize: '13px', margin: '8px 0', textAlign: 'center' }}>
            {errorMessage}
          </p>
        )}

        {/* Botones de acción principales (Frame 187: Cancelar en negro, Guardar cambios en azul #2873ED) */}
        <div className="schedule-exam-actions">
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
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : saveSuccess ? '¡Guardado!' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </BottomDrawer>
  );
}
