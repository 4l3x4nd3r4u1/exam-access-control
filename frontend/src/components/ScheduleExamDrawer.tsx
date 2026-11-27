import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { MouseEvent } from 'react';

import { BottomDrawer } from './BottomDrawer';
import { ConfirmModal } from './ConfirmModal';

import { examService } from '../services/examService';
import { courseService } from '../services/courseService';
import { authService } from '../services/authService';
import { staffService } from '../services/staffService';

import type {
  TeacherCourse,
  EnrolledStudent,
} from '../types/course';
import type { AcademicStaffMember } from '../types/staff';
import type {
  AvailableRoom,
  ExamType,
  ScheduleExamPayload,
  ScheduleExamRoomPayload,
} from '../types/exam';

import {
  suggestOptimalRooms,
  distributeStudentsEqually,
} from '../utils/roomSuggestion';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
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

interface ManualRoom extends AvailableRoom {
  isManual: true;
}

interface ScheduleExamDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  course: TeacherCourse;
  onSaved?: (data: ScheduledExamData) => void;
}

function getLocalToday(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLocalTomorrow(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseTimeToMinutes(time24h: string): number {
  if (!time24h || !time24h.includes(':')) {
    return -1;
  }
  const [hours, minutes] = time24h.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return -1;
  }
  return hours * 60 + minutes;
}

function minutesToTime24h(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatTime12h(time24h: string): string {
  const total = parseTimeToMinutes(time24h);
  if (total < 0) return time24h;
  const hours24 = Math.floor(total / 60);
  const minutes = total % 60;
  const period = hours24 >= 12 ? 'pm' : 'am';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
}

function formatDurationLabel(start24h: string, end24h: string): string {
  const startMin = parseTimeToMinutes(start24h);
  const endMin = parseTimeToMinutes(end24h);
  if (startMin < 0 || endMin <= startMin) {
    return '—';
  }
  const diff = endMin - startMin;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

function isDateTimePast(dateString: string, time24h: string): boolean {
  if (!dateString || !time24h) {
    return false;
  }
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = time24h.split(':').map(Number);
  if ([year, month, day, hours, minutes].some(Number.isNaN)) {
    return false;
  }
  const candidate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return candidate.getTime() <= Date.now();
}

function isDateCompletelyPast(dateString: string): boolean {
  const today = getLocalToday();
  if (dateString < today) return true;
  if (dateString > today) return false;
  return isDateTimePast(dateString, '23:30');
}

function getInitialSchedule(): { date: string; startTime: string; endTime: string } {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const nextQuarter = Math.ceil((currentMinutes + 15) / 15) * 15;

  if (nextQuarter <= 22 * 60) {
    const startTime = minutesToTime24h(nextQuarter);
    const endTime = minutesToTime24h(Math.min(nextQuarter + 90, 23 * 60 + 45));
    return { date: getLocalToday(), startTime, endTime };
  }

  return {
    date: getLocalTomorrow(),
    startTime: '08:15',
    endTime: '09:45',
  };
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

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function ScheduleExamDrawer({
  isOpen,
  onClose,
  course,
  onSaved,
}: ScheduleExamDrawerProps) {
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [selectedExamTypeId, setSelectedExamTypeId] = useState<number | null>(null);
  const [isLoadingExamTypes, setIsLoadingExamTypes] = useState(false);

  const [initialSchedule] = useState(getInitialSchedule);
  const [rawDate, setRawDate] = useState(() => initialSchedule.date);
  const [startTime, setStartTime] = useState(() => initialSchedule.startTime);
  const [endTime, setEndTime] = useState(() => initialSchedule.endTime);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() =>
    Number(initialSchedule.date.split('-')[0]),
  );
  const [calendarMonth, setCalendarMonth] = useState(
    () => Number(initialSchedule.date.split('-')[1]) - 1,
  );

  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [manualRooms, setManualRooms] = useState<ManualRoom[]>([]);
  const [selectedAutoRoomIds, setSelectedAutoRoomIds] = useState<Array<string | number>>([]);
  const [hasManuallyChangedAutoRooms, setHasManuallyChangedAutoRooms] = useState(false);
  const [isAutoRooms, setIsAutoRooms] = useState(true);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  // Formulario directo para escribir aulas manualmente (cuando Aulas automáticas está desactivado)
  const [manualRoomName, setManualRoomName] = useState('');
  const [manualRoomCapacity, setManualRoomCapacity] = useState('40');
  const [manualRoomError, setManualRoomError] = useState<string | null>(null);

  // Auxiliares de docencia
  const [academicStaff, setAcademicStaff] = useState<AcademicStaffMember[]>([]);
  const [selectedAuxiliarIds, setSelectedAuxiliarIds] = useState<number[]>([]);
  const [auxSearch, setAuxSearch] = useState('');
  const [isAuxDropdownOpen, setIsAuxDropdownOpen] = useState(false);
  const auxDropdownRef = useRef<HTMLDivElement>(null);

  // Grupos propios de la misma materia
  const [subjectGroups, setSubjectGroups] = useState<TeacherCourse[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([
    Number(course.course_group_id),
  ]);

  // Normas generales y particulares
  const [generalRules, setGeneralRules] = useState<string[]>([]);
  const [isAddingGeneralRule, setIsAddingGeneralRule] = useState(false);
  const [newGeneralRuleText, setNewGeneralRuleText] = useState('');

  const [particularRules, setParticularRules] = useState<ParticularRule[]>([]);
  const [isAddingParticular, setIsAddingParticular] = useState(false);
  const [particularSis, setParticularSis] = useState('');
  const [particularRuleText, setParticularRuleText] = useState('');
  const [particularError, setParticularError] = useState<string | null>(null);
  const [isCheckingStudent, setIsCheckingStudent] = useState(false);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentSession = authService.getStoredSession();
  const isAssignedTeacher =
    course.can_interact ??
    (currentSession && course.teacher_id
      ? course.teacher_id === currentSession.user_id
      : true);

  const isStartPast = isDateTimePast(rawDate, startTime);
  const isEndInvalid =
    parseTimeToMinutes(startTime) < 0 ||
    parseTimeToMinutes(endTime) <= parseTimeToMinutes(startTime);
  const durationLabel = formatDurationLabel(startTime, endTime);

  const totalEnrolled = useMemo(() => {
    if (enrolledStudents.length > 0) {
      return enrolledStudents.length;
    }
    const selectedCourses = subjectGroups.filter((g) =>
      selectedGroupIds.includes(Number(g.course_group_id)),
    );
    if (selectedCourses.length > 0) {
      return selectedCourses.reduce(
        (acc, g) => acc + (g.total_enrolled || 0),
        0,
      );
    }
    return course.total_enrolled ?? 0;
  }, [enrolledStudents, subjectGroups, selectedGroupIds, course.total_enrolled]);

  // Cerrar dropdown de auxiliares al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | globalThis.MouseEvent) => {
      if (
        auxDropdownRef.current &&
        !auxDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAuxDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reinicio limpio al abrir el drawer
  useEffect(() => {
    if (!isOpen) return;

    const initial = getInitialSchedule();
    setRawDate(initial.date);
    setStartTime(initial.startTime);
    setEndTime(initial.endTime);

    const [initY, initM] = initial.date.split('-').map(Number);
    setCalendarYear(initY);
    setCalendarMonth(initM - 1);
    setIsCalendarOpen(false);

    setErrorMessage(null);
    setIsAutoRooms(true);
    setHasManuallyChangedAutoRooms(false);
    setManualRooms([]);
    setManualRoomName('');
    setManualRoomCapacity('40');
    setManualRoomError(null);

    setSelectedAuxiliarIds([]);
    setAuxSearch('');
    setIsAuxDropdownOpen(false);
    setSelectedGroupIds([Number(course.course_group_id)]);

    let isMounted = true;

    // Cargar otros grupos del docente para esta misma materia
    const teacherId = course.teacher_id ?? currentSession?.user_id;
    if (teacherId) {
      courseService
        .getTeacherCourses(Number(teacherId), course.academic_term)
        .then((courses) => {
          if (!isMounted) return;
          const matching = (courses || []).filter((c) => {
            const isMyOwn =
              !c.teacher_id || Number(c.teacher_id) === Number(teacherId);
            const matchCode = Boolean(
              course.subject_code &&
                c.subject_code &&
                c.subject_code.trim().toUpperCase() ===
                  course.subject_code.trim().toUpperCase(),
            );
            const matchName = Boolean(
              course.subject_name &&
                c.subject_name &&
                c.subject_name.trim().toUpperCase() ===
                  course.subject_name.trim().toUpperCase(),
            );
            const matchTerm =
              !course.academic_term ||
              !c.academic_term ||
              c.academic_term === course.academic_term;
            return isMyOwn && (matchCode || matchName) && matchTerm;
          });
          setSubjectGroups(matching);
        })
        .catch(() => {
          if (isMounted) setSubjectGroups([]);
        });
    }

    staffService
      .getAcademicStaff()
      .then((staff) => {
        if (isMounted) setAcademicStaff(staff);
      })
      .catch(() => {
        if (isMounted) setAcademicStaff([]);
      });

    setIsLoadingExamTypes(true);
    examService
      .getExamTypes()
      .then((types) => {
        if (!isMounted) return;
        setExamTypes(types);
        if (types.length > 0) {
          setSelectedExamTypeId((current) => current ?? types[0].value);
        }
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setExamTypes([]);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar los tipos de examen.',
        );
      })
      .finally(() => {
        if (isMounted) setIsLoadingExamTypes(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, course.course_group_id]);

  // Estudiantes inscritos de todos los grupos seleccionados
  useEffect(() => {
    if (!isOpen || selectedGroupIds.length === 0) return;

    let isMounted = true;
    Promise.all(
      selectedGroupIds.map((id) =>
        courseService.getEnrolledStudents(String(id)).catch(() => []),
      ),
    )
      .then((results) => {
        if (!isMounted) return;
        const merged: EnrolledStudent[] = [];
        const seen = new Set<number>();
        for (const list of results) {
          for (const s of list) {
            if (!seen.has(s.userId)) {
              seen.add(s.userId);
              merged.push(s);
            }
          }
        }
        setEnrolledStudents(merged);
      })
      .catch(() => {
        if (isMounted) setEnrolledStudents([]);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedGroupIds]);

  // Aulas disponibles según fecha, hora inicio y hora fin
  useEffect(() => {
    if (!isOpen || !rawDate || !startTime || isEndInvalid) return;

    let isMounted = true;
    setIsLoadingRooms(true);

    examService
      .getAvailableRooms(rawDate, startTime, endTime)
      .then((rooms) => {
        if (!isMounted) return;
        setAvailableRooms(rooms);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setAvailableRooms([]);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar las aulas disponibles.',
        );
      })
      .finally(() => {
        if (isMounted) setIsLoadingRooms(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, rawDate, startTime, endTime, isEndInvalid]);

  const optimalSuggestion = useMemo(() => {
    return suggestOptimalRooms(availableRooms, totalEnrolled);
  }, [availableRooms, totalEnrolled]);

  // Sincronizar selección recomendada cuando las aulas disponibles o inscritos cambian
  useEffect(() => {
    if (!hasManuallyChangedAutoRooms || selectedAutoRoomIds.length === 0) {
      setSelectedAutoRoomIds(optimalSuggestion.suggestedRoomIds);
    } else {
      setSelectedAutoRoomIds((current) =>
        current.filter((roomId) =>
          availableRooms.some((room) => String(room.room_id) === String(roomId)),
        ),
      );
    }
  }, [
    availableRooms,
    optimalSuggestion.suggestedRoomIds,
    hasManuallyChangedAutoRooms,
  ]);

  const isCurrentSelectionOptimal = useMemo(() => {
    if (
      optimalSuggestion.suggestedRoomIds.length !== selectedAutoRoomIds.length ||
      optimalSuggestion.suggestedRoomIds.length === 0
    ) {
      return false;
    }
    const currentSet = new Set(selectedAutoRoomIds.map(String));
    return optimalSuggestion.suggestedRoomIds.every((id) =>
      currentSet.has(String(id)),
    );
  }, [optimalSuggestion.suggestedRoomIds, selectedAutoRoomIds]);

  // Aulas activas según el modo del switch:
  // ON  -> solo aulas recomendadas/precargadas del sistema
  // OFF -> solo aulas escritas manualmente por el docente
  const selectedRooms = useMemo<Array<AvailableRoom & { isManual?: boolean }>>(() => {
    const safeAvailable = Array.isArray(availableRooms) ? availableRooms : [];
    const safeManual = Array.isArray(manualRooms) ? manualRooms : [];
    if (isAutoRooms) {
      return safeAvailable
        .filter((room) =>
          room && selectedAutoRoomIds.some((id) => String(id) === String(room.room_id)),
        )
        .sort((a, b) => (Number(b.capacity) || 0) - (Number(a.capacity) || 0));
    }

    return [...safeManual].sort((a, b) => (Number(b.capacity) || 0) - (Number(a.capacity) || 0));
  }, [isAutoRooms, availableRooms, selectedAutoRoomIds, manualRooms]);

  const hasInvalidCustomCapacity = useMemo(() => {
    if (isAutoRooms) return false;
    const safeManual = Array.isArray(manualRooms) ? manualRooms : [];
    return safeManual.some((room) => {
      const cap = Number(room?.capacity) || 0;
      return cap < 1 || cap > 2000;
    });
  }, [isAutoRooms, manualRooms]);

  const totalCapacity = useMemo(() => {
    return selectedRooms.reduce(
      (sum, room) => sum + Math.max(0, Number(room?.capacity) || 0),
      0,
    );
  }, [selectedRooms]);

  const roomAllocations = useMemo(() => {
    const useEqualDistribution = !isAutoRooms || hasManuallyChangedAutoRooms;

    const counts = useEqualDistribution
      ? distributeStudentsEqually(
          selectedRooms.map((room) => ({ capacity: Math.max(0, Number(room?.capacity) || 0) })),
          totalEnrolled,
        )
      : null;

    let remainingCount = totalEnrolled;
    let studentOffset = 0;
    const safeStudents = Array.isArray(enrolledStudents) ? enrolledStudents : [];

    return selectedRooms.map((room, i) => {
      const effectiveCapacity = Math.max(0, Number(room?.capacity) || 0);
      const studentCount = counts
        ? (counts[i] ?? 0)
        : Math.min(effectiveCapacity, remainingCount);

      const students = safeStudents.slice(
        studentOffset,
        studentOffset + studentCount,
      );

      studentOffset += studentCount;
      remainingCount = Math.max(0, remainingCount - studentCount);

      return {
        room,
        effectiveCapacity,
        studentCount,
        studentUserIds: students
          .filter((student) => student && student.userId !== undefined)
          .map((student) => student.userId),
      };
    });
  }, [
    selectedRooms,
    totalEnrolled,
    enrolledStudents,
    isAutoRooms,
    hasManuallyChangedAutoRooms,
  ]);

  const distributionSummary = useMemo(() => {
    if (roomAllocations.length === 0) return '';
    return roomAllocations
      .map(
        (alloc) =>
          `${alloc.studentCount} alumnos en ${alloc.room.room_name}`,
      )
      .join(' · ');
  }, [roomAllocations]);

  const selectedExamType = useMemo(() => {
    if (!Array.isArray(examTypes)) return undefined;
    return examTypes.find((item) => item.value === selectedExamTypeId);
  }, [examTypes, selectedExamTypeId]);

  const availableAuxiliaries = useMemo(() => {
    if (!Array.isArray(academicStaff)) return [];
    return academicStaff.filter(
      (m) =>
        m &&
        m.is_active !== false &&
        Array.isArray(m.roles) &&
        m.roles.some((r) => typeof r === 'string' && r.toUpperCase() === 'AUXILIAR'),
    );
  }, [academicStaff]);

  const filteredAuxiliaries = useMemo(() => {
    const unselected = availableAuxiliaries.filter(
      (a) => !selectedAuxiliarIds.includes(a.user_id),
    );
    if (!auxSearch.trim()) return unselected;
    const q = auxSearch.trim().toLowerCase();
    return unselected.filter(
      (a) =>
        a.full_name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q),
    );
  }, [availableAuxiliaries, selectedAuxiliarIds, auxSearch]);

  const selectedAuxiliaries = useMemo(() => {
    return availableAuxiliaries.filter((a) =>
      selectedAuxiliarIds.includes(a.user_id),
    );
  }, [availableAuxiliaries, selectedAuxiliarIds]);

  const handleAddAuxiliar = (userId: number) => {
    setSelectedAuxiliarIds((prev) =>
      prev.includes(userId) ? prev : [...prev, userId],
    );
    setAuxSearch('');
    setIsAuxDropdownOpen(false);
  };

  const handleRemoveAuxiliar = (userId: number) => {
    setSelectedAuxiliarIds((prev) => prev.filter((id) => id !== userId));
  };

  const handleToggleAutoRooms = () => {
    setIsAutoRooms((prev) => !prev);
    setErrorMessage(null);
    setManualRoomError(null);
  };

  const handleApplyOptimalSuggestion = () => {
    setSelectedAutoRoomIds(optimalSuggestion.suggestedRoomIds);
    setHasManuallyChangedAutoRooms(false);
    setErrorMessage(null);
  };

  const handleToggleAutoRoom = (roomId: string | number) => {
    const key = String(roomId);
    setHasManuallyChangedAutoRooms(true);
    setSelectedAutoRoomIds((current) => {
      const exists = current.some((id) => String(id) === key);
      if (exists) {
        return current.filter((id) => String(id) !== key);
      }
      return [...current, roomId];
    });
    setErrorMessage(null);
  };

  const handleManualRoomCapacityChange = (roomId: string | number, value: string) => {
    const parsed = value === '' ? 0 : Number(value);
    if (Number.isNaN(parsed)) return;
    const key = String(roomId);
    setManualRooms((prev) =>
      prev.map((room) =>
        String(room.room_id) === key ? { ...room, capacity: parsed } : room,
      ),
    );
  };

  const handleAddManualRoom = () => {
    const cleanName = manualRoomName.trim();
    const cap = Number(manualRoomCapacity);

    if (!cleanName) {
      setManualRoomError('Ingresa el nombre del aula.');
      return;
    }

    if (!Number.isInteger(cap) || cap < 1 || cap > 2000) {
      setManualRoomError('Ingresa una capacidad válida (entre 1 y 2000).');
      return;
    }

    const duplicate = manualRooms.some(
      (r) => r.room_name.trim().toLowerCase() === cleanName.toLowerCase(),
    );
    if (duplicate) {
      setManualRoomError('Ya agregaste un aula con ese nombre.');
      return;
    }

    const newRoom: ManualRoom = {
      room_id: `manual-${Date.now()}`,
      room_name: cleanName,
      capacity: cap,
      isManual: true,
    };

    setManualRooms((prev) => [...prev, newRoom]);
    setManualRoomName('');
    setManualRoomCapacity('40');
    setManualRoomError(null);
    setErrorMessage(null);
  };

  const handleRemoveManualRoom = (roomId: string | number) => {
    const key = String(roomId);
    setManualRooms((prev) => prev.filter((r) => String(r.room_id) !== key));
  };

  const handleToggleCalendar = () => {
    setIsCalendarOpen((current) => {
      if (!current && rawDate) {
        const [year, month] = rawDate.split('-').map(Number);
        if (!Number.isNaN(year) && !Number.isNaN(month)) {
          setCalendarYear(year);
          setCalendarMonth(month - 1);
        }
      }
      return !current;
    });
  };

  const handlePrevMonth = (event: MouseEvent) => {
    event.stopPropagation();
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((year) => year - 1);
      return;
    }
    setCalendarMonth((month) => month - 1);
  };

  const handleNextMonth = (event: MouseEvent) => {
    event.stopPropagation();
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((year) => year + 1);
      return;
    }
    setCalendarMonth((month) => month + 1);
  };

  const handleSelectDay = (day: number, event: MouseEvent) => {
    event.stopPropagation();
    const formatted =
      `${calendarYear}-` +
      `${String(calendarMonth + 1).padStart(2, '0')}-` +
      `${String(day).padStart(2, '0')}`;

    if (isDateCompletelyPast(formatted)) return;

    setRawDate(formatted);
    setIsCalendarOpen(false);
    setErrorMessage(null);
  };

  const handleAddGeneralRule = () => {
    const cleanText = newGeneralRuleText.trim();
    if (!cleanText) return;
    setGeneralRules((current) => [...current, cleanText]);
    setNewGeneralRuleText('');
    setIsAddingGeneralRule(false);
  };

  const handleDeleteGeneralRule = (index: number) => {
    setGeneralRules((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

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

    setIsCheckingStudent(true);
    setParticularError(null);

    try {
      let result: { success: boolean; data?: { user_id: number } | null } | null = null;
      for (const gId of selectedGroupIds) {
        try {
          const res = await examService.checkStudentEnrollment(
            gId,
            sis,
          );
          if (res?.success && res?.data) {
            result = res;
            break;
          }
        } catch {
          // continuar con el siguiente grupo si no se encuentra
        }
      }

      if (!result || !result.success || !result.data) {
        setParticularError('El estudiante no pertenece a los grupos seleccionados.');
        return;
      }

      const duplicated = particularRules.some(
        (item) =>
          item.studentId === result.data?.user_id && item.rule === rule,
      );

      if (duplicated) {
        setParticularError(
          'Esta norma particular ya fue agregada para el estudiante.',
        );
        return;
      }

      setParticularRules((current) => [
        ...current,
        {
          studentId: result.data!.user_id,
          codigoSis: sis,
          rule,
        },
      ]);

      setParticularSis('');
      setParticularRuleText('');
      setIsAddingParticular(false);
    } catch (error: unknown) {
      setParticularError(
        error instanceof Error
          ? error.message
          : 'No se pudo verificar al estudiante.',
      );
    } finally {
      setIsCheckingStudent(false);
    }
  };

  const handleDeleteParticularRule = (index: number) => {
    setParticularRules((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const handleSave = () => {
    if (!isAssignedTeacher) {
      setErrorMessage(
        'No tienes permiso para programar exámenes en una materia asignada a otro docente.',
      );
      return;
    }
    if (isStartPast) {
      setErrorMessage(
        'No se puede programar un examen en un horario pasado a la hora actual.',
      );
      return;
    }
    if (isEndInvalid) {
      setErrorMessage(
        'La hora de finalización debe ser posterior a la hora de inicio.',
      );
      return;
    }
    if (selectedExamTypeId === null) {
      setErrorMessage('Debes seleccionar un tipo de examen.');
      return;
    }
    if (selectedRooms.length === 0) {
      setErrorMessage('Debes seleccionar al menos un aula para el examen.');
      return;
    }
    if (hasInvalidCustomCapacity) {
      setErrorMessage(
        'Revisa la capacidad elegida de cada aula (debe ser entre 1 y su capacidad máxima).',
      );
      return;
    }
    if (totalCapacity < totalEnrolled) {
      setErrorMessage(
        `Los cupos elegidos (${totalCapacity} plazas) no alcanzan para los ${totalEnrolled} estudiantes inscritos. Selecciona otro aula o aumenta la capacidad.`,
      );
      return;
    }

    setErrorMessage(null);
    setIsConfirmModalOpen(true);
  };

  const executeSave = async () => {
    if (isStartPast || isEndInvalid) {
      setErrorMessage('Revisa el horario del examen antes de guardar.');
      setIsConfirmModalOpen(false);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const roomsPayload: ScheduleExamRoomPayload[] = roomAllocations.map(
      (allocation, index) => {
        const isManual = String(allocation.room.room_id).startsWith('manual-');
        const auxId =
          selectedAuxiliarIds.length > 0
            ? selectedAuxiliarIds[index % selectedAuxiliarIds.length]
            : null;

        if (isManual) {
          return {
            roomId: null,
            customRoomName: allocation.room.room_name,
            customRoomCapacity: allocation.room.capacity,
            assignedCapacity: allocation.effectiveCapacity,
            students: [...allocation.studentUserIds],
            auxiliarId: auxId,
          };
        }

        return {
          roomId: Number(allocation.room.room_id),
          assignedCapacity: allocation.effectiveCapacity,
          students: [...allocation.studentUserIds],
          auxiliarId: auxId,
        };
      },
    );

    for (const particularRule of particularRules) {
      const isAssigned = roomsPayload.some((room) =>
        room.students.includes(particularRule.studentId),
      );
      if (!isAssigned && roomsPayload.length > 0) {
        roomsPayload[0].students.push(particularRule.studentId);
      }
    }

    const payload: ScheduleExamPayload = {
      examTypeId: selectedExamTypeId!,
      date: rawDate,
      startTime,
      endTime,
      rooms: roomsPayload,
      generalRules,
      studentRules: particularRules.map((item) => ({
        studentId: item.studentId,
        rule: item.rule,
        codigoSis: item.codigoSis,
      })),
      courseGroupIds: selectedGroupIds,
      auxiliarIds: selectedAuxiliarIds,
    };

    try {
      await examService.scheduleExam(course.course_group_id, payload);

      setSaveSuccess(true);
      setIsConfirmModalOpen(false);

      if (onSaved) {
        onSaved({
          tipoExamen: selectedExamType?.label ?? '',
          fecha: rawDate,
          horaInicio: formatTime12h(startTime),
          duracion: durationLabel,
          horaFin: formatTime12h(endTime),
          aulas: selectedRooms.map((room) => room.room_name),
          normas: generalRules,
        });
      }

      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (error: unknown) {
      setIsConfirmModalOpen(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Error al guardar el examen.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomDrawer
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Programar Examen"
      className="schedule-exam-bottom-drawer"
    >
      <div className="schedule-exam-drawer-content se-organized-drawer">
        <header className="se-drawer-header">
          <h2 className="schedule-exam-title se-drawer-title">
            Programar Examen
          </h2>
          <p className="se-drawer-subtitle">
            {course.subject_name} ·{' '}
            {subjectGroups.length > 1
              ? `Grupos ${subjectGroups
                  .filter((g) =>
                    selectedGroupIds.includes(Number(g.course_group_id)),
                  )
                  .map((g) => g.group_code)
                  .join(', ')}`
              : `Grupo ${course.group_code}`}{' '}
            · {totalEnrolled} {totalEnrolled === 1 ? 'inscrito' : 'inscritos'}
          </p>
        </header>

        {!isAssignedTeacher && (
          <div className="se-alert-banner is-error" role="alert">
            No eres el docente asignado a esta materia. No puedes programar
            exámenes para otros docentes.
          </div>
        )}

        <div className="se-sections-stack">
          {/* TIPO DE EXAMEN */}
          <section className="se-card" aria-label="Tipo de Examen">
            <div className="se-field-group">
              <label htmlFor="schedule-exam-type" className="se-card-heading">
                Tipo de Examen
              </label>
              <select
                id="schedule-exam-type"
                className="schedule-exam-select se-full-select"
                value={selectedExamTypeId ?? ''}
                onChange={(event) =>
                  setSelectedExamTypeId(Number(event.target.value))
                }
                disabled={isLoadingExamTypes || examTypes.length === 0}
              >
                {isLoadingExamTypes && (
                  <option value="">Cargando tipos...</option>
                )}
                {!isLoadingExamTypes && examTypes.length === 0 && (
                  <option value="">Sin tipos disponibles</option>
                )}
                {examTypes.map((examType) => (
                  <option key={examType.value} value={examType.value}>
                    {examType.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* TUS GRUPOS A EVALUAR (Visible únicamente si el docente tiene más de 1 grupo para esta materia) */}
          {subjectGroups.length > 1 && (
            <section className="se-card" aria-label="Tus Grupos a Evaluar">
              <div className="se-card-header-row">
                <h3 className="se-card-heading">
                  Tus Grupos a Evaluar (Marca los que participarán):
                </h3>
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: '#16a34a',
                    fontWeight: 600,
                  }}
                >
                  ✓ {totalEnrolled} estudiantes ({selectedGroupIds.length}{' '}
                  {selectedGroupIds.length === 1 ? 'grupo' : 'grupos'})
                </span>
              </div>
              <p className="se-helper-text">
                Selecciona qué grupos de esta materia rendirán el examen de forma
                conjunta.
              </p>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {subjectGroups.map((g) => {
                  const isChecked = selectedGroupIds.includes(
                    Number(g.course_group_id),
                  );
                  return (
                    <label
                      key={g.course_group_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: isChecked
                          ? '1.5px solid #2563eb'
                          : '1px solid #cbd5e1',
                        background: isChecked ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedGroupIds((prev) => {
                              const gId = Number(g.course_group_id);
                              if (prev.includes(gId)) {
                                if (prev.length === 1) return prev; // No permitir deseleccionar el último
                                return prev.filter((id) => id !== gId);
                              }
                              return [...prev, gId];
                            });
                          }}
                          style={{
                            width: '16px',
                            height: '16px',
                            accentColor: '#2563eb',
                            cursor: 'pointer',
                          }}
                        />
                        <div>
                          <strong
                            style={{
                              fontSize: '0.9rem',
                              color: isChecked ? '#1e40af' : '#0f172a',
                            }}
                          >
                            Grupo {g.group_code}
                          </strong>
                          <span
                            style={{
                              fontSize: '0.78rem',
                              color: '#64748b',
                              marginLeft: '6px',
                            }}
                          >
                            ({g.subject_name || course.subject_name})
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
                        {g.total_enrolled ?? 0} estudiantes
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          {/* BLOQUE 2: FECHA Y HORARIO DEFINIDO POR EL DOCENTE */}
          <section className="se-card" aria-label="Fecha y horario">
            <div className="se-card-header-row">
              <h3 className="se-card-heading">Fecha y horario</h3>
              <span className="se-duration-chip">
                Duración: {durationLabel}
              </span>
            </div>

            <div className="se-field-group">
              <label
                htmlFor="schedule-exam-date-trigger"
                className="se-field-label"
              >
                Fecha
              </label>
              <button
                id="schedule-exam-date-trigger"
                type="button"
                className="schedule-exam-date-box se-date-box"
                onClick={handleToggleCalendar}
                aria-expanded={isCalendarOpen}
              >
                <div className="schedule-exam-date-left">
                  <svg
                    viewBox="0 0 24 24"
                    className="schedule-exam-calendar-icon"
                    aria-hidden="true"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span className="schedule-exam-date-text">
                    {formatDateToSpanish(rawDate)}
                  </span>
                </div>
                <span
                  className="schedule-exam-chevron-circle"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={`schedule-exam-chevron-icon ${
                      isCalendarOpen ? 'open' : ''
                    }`}
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </button>

              {isCalendarOpen && (
                <div
                  className="schedule-exam-calendar-popover"
                  role="region"
                  aria-label="Selector de calendario"
                >
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
                    {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map((day) => (
                      <span
                        key={day}
                        className="schedule-exam-calendar-weekday"
                      >
                        {day}
                      </span>
                    ))}
                  </div>

                  <div className="schedule-exam-calendar-days">
                    {Array.from({
                      length: getFirstDayOfWeek(calendarYear, calendarMonth),
                    }).map((_, index) => (
                      <span
                        key={`empty-${index}`}
                        className="schedule-exam-calendar-day empty"
                      />
                    ))}

                    {Array.from({
                      length: getDaysInMonth(calendarYear, calendarMonth),
                    }).map((_, index) => {
                      const dayNumber = index + 1;
                      const [currentYear, currentMonth, currentDay] = rawDate
                        .split('-')
                        .map(Number);

                      const isSelected =
                        currentYear === calendarYear &&
                        currentMonth === calendarMonth + 1 &&
                        currentDay === dayNumber;

                      const candidateDate =
                        `${calendarYear}-` +
                        `${String(calendarMonth + 1).padStart(2, '0')}-` +
                        `${String(dayNumber).padStart(2, '0')}`;

                      const isPast = isDateCompletelyPast(candidateDate);

                      return (
                        <button
                          key={dayNumber}
                          type="button"
                          className={`schedule-exam-calendar-day ${
                            isSelected ? 'selected' : ''
                          }`}
                          disabled={isPast}
                          onClick={(event) => handleSelectDay(dayNumber, event)}
                        >
                          {dayNumber}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="se-time-grid">
              <div className="se-field-group">
                <label
                  htmlFor="schedule-exam-start-time"
                  className="se-field-label"
                >
                  Hora de inicio
                </label>
                <input
                  id="schedule-exam-start-time"
                  type="time"
                  className="se-time-input"
                  value={startTime}
                  onChange={(event) => {
                    const nextStart = event.target.value;
                    setStartTime(nextStart);
                    setErrorMessage(null);
                    const startMin = parseTimeToMinutes(nextStart);
                    const endMin = parseTimeToMinutes(endTime);
                    if (startMin >= 0 && endMin <= startMin) {
                      setEndTime(
                        minutesToTime24h(Math.min(startMin + 90, 23 * 60 + 55)),
                      );
                    }
                  }}
                />
              </div>

              <div className="se-field-group">
                <label
                  htmlFor="schedule-exam-end-time"
                  className="se-field-label"
                >
                  Hora de finalización
                </label>
                <input
                  id="schedule-exam-end-time"
                  type="time"
                  className="se-time-input"
                  value={endTime}
                  onChange={(event) => {
                    setEndTime(event.target.value);
                    setErrorMessage(null);
                  }}
                />
              </div>
            </div>

            {isStartPast && (
              <p className="se-inline-alert" role="alert">
                El horario de inicio ya ha pasado. Selecciona una hora posterior.
              </p>
            )}

            {!isStartPast && isEndInvalid && (
              <p className="se-inline-alert" role="alert">
                La hora de finalización debe ser posterior a la hora de inicio.
              </p>
            )}
          </section>

          {/* BLOQUE 3: AULAS, SWITCH AUTOMÁTICO, AULA MANUAL Y CAPACIDAD */}
          <section className="se-card" aria-label="Aulas y capacidad">
            <div className="se-card-header-row">
              <h3 className="se-card-heading">Aulas y capacidad</h3>

              <label className="se-switch-control">
                <span className="se-switch-label">Aulas automáticas</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAutoRooms}
                  className={`se-switch-track ${isAutoRooms ? 'is-on' : ''}`}
                  onClick={handleToggleAutoRooms}
                >
                  <span className="se-switch-thumb" />
                </button>
              </label>
            </div>

            <div className="se-capacity-summary">
              {selectedRooms.length === 0 ? (
                <span className="se-field-caption">
                  Asigna al menos un aula ({totalEnrolled}{' '}
                  {totalEnrolled === 1 ? 'inscrito' : 'inscritos'})
                </span>
              ) : (
                <span
                  className={`se-capacity-badge ${
                    totalCapacity < totalEnrolled ? 'is-short' : 'is-ok'
                  }`}
                >
                  {totalCapacity} plazas para {totalEnrolled} inscritos
                </span>
              )}
              {isAutoRooms && isCurrentSelectionOptimal && selectedRooms.length > 0 && (
                <span className="se-auto-tag">Sugerencia óptima</span>
              )}
            </div>

            {distributionSummary && (
              <p className="schedule-exam-distribution-text se-dist-summary">
                {distributionSummary}
              </p>
            )}

            {selectedRooms.length > 0 && totalCapacity < totalEnrolled && (
              <p className="se-inline-alert" role="alert">
                Faltan {totalEnrolled - totalCapacity} cupos para cubrir a los{' '}
                {totalEnrolled} inscritos.
              </p>
            )}

            {isAutoRooms ? (
              <div className="se-auto-rooms-box">
                <div className="schedule-exam-auto-suggest-header">
                  <span className="se-field-caption">
                    {isCurrentSelectionOptimal
                      ? 'Aulas recomendadas automáticamente según capacidad:'
                      : 'Aulas disponibles para este horario:'}
                  </span>

                  {!isCurrentSelectionOptimal && availableRooms.length > 0 && (
                    <button
                      type="button"
                      className="schedule-exam-suggest-action-btn"
                      onClick={handleApplyOptimalSuggestion}
                      title="Restablecer la selección óptima calculada por el sistema"
                    >
                      Restablecer sugerencia óptima
                    </button>
                  )}
                </div>

                {isLoadingRooms ? (
                  <p className="schedule-exam-empty-rules">
                    Cargando aulas disponibles...
                  </p>
                ) : availableRooms.length === 0 ? (
                  <p className="schedule-exam-empty-rules">
                    No hay aulas disponibles en este horario. Desactiva "Aulas
                    automáticas" para escribir un aula manualmente.
                  </p>
                ) : (
                  <div className="schedule-exam-classrooms-grid">
                    {availableRooms.map((room) => {
                      const isChecked = selectedAutoRoomIds.some(
                        (id) => String(id) === String(room.room_id),
                      );
                      const isSuggested = optimalSuggestion.suggestedRoomIds.some(
                        (id) => String(id) === String(room.room_id),
                      );

                      return (
                        <button
                          key={room.room_id}
                          type="button"
                          className={`schedule-exam-room-pill ${
                            isChecked ? 'selected' : ''
                          } ${isSuggested ? 'suggested-pill' : ''}`}
                          onClick={() => handleToggleAutoRoom(room.room_id)}
                        >
                          <span className="schedule-exam-room-check">
                            {isChecked ? '✓' : '+'}
                          </span>
                          <span className="schedule-exam-room-name">
                            {room.room_name}
                          </span>
                          <span className="schedule-exam-room-cap">
                            ({room.capacity})
                          </span>
                          {isSuggested && (
                            <span className="schedule-exam-room-star-tag">
                              Sugerida
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="se-manual-rooms-panel">
                <span className="se-field-caption">
                  Escribe el nombre del aula y la capacidad elegida:
                </span>

                <div className="se-manual-add-box">
                  <div className="se-manual-add-grid">
                    <div className="se-field-group">
                      <label
                        htmlFor="manual-room-name"
                        className="se-field-caption"
                      >
                        Nombre del aula
                      </label>
                      <input
                        id="manual-room-name"
                        type="text"
                        className="se-compact-input"
                        placeholder="Ej. Aula 692C / Lab 2"
                        value={manualRoomName}
                        onChange={(e) => {
                          setManualRoomName(e.target.value);
                          setManualRoomError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddManualRoom();
                          }
                        }}
                      />
                    </div>
                    <div className="se-field-group">
                      <label
                        htmlFor="manual-room-cap"
                        className="se-field-caption"
                      >
                        Capacidad
                      </label>
                      <input
                        id="manual-room-cap"
                        type="number"
                        min={1}
                        max={2000}
                        className="se-compact-input"
                        value={manualRoomCapacity}
                        onChange={(e) => {
                          setManualRoomCapacity(e.target.value);
                          setManualRoomError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddManualRoom();
                          }
                        }}
                      />
                    </div>
                  </div>

                  {manualRoomError && (
                    <p className="se-inline-alert">{manualRoomError}</p>
                  )}

                  <div className="schedule-exam-new-rule-actions">
                    <button
                      type="button"
                      className="schedule-exam-new-rule-submit"
                      onClick={handleAddManualRoom}
                    >
                      + Agregar aula
                    </button>
                  </div>
                </div>

                {manualRooms.length > 0 && (
                  <div className="se-capacity-editor-list">
                    <span className="se-field-caption">
                      Aulas habilitadas manualmente:
                    </span>
                    {roomAllocations.map((alloc) => {
                      const key = String(alloc.room.room_id);
                      const isBad =
                        alloc.room.capacity < 1 || alloc.room.capacity > 2000;

                      return (
                        <div
                          key={key}
                          className={`se-capacity-row ${isBad ? 'is-invalid' : ''}`}
                        >
                          <div className="se-capacity-row-info">
                            <strong>{alloc.room.room_name}</strong>
                            <span>Asignados: {alloc.studentCount} alumnos</span>
                          </div>

                          <div className="se-capacity-row-controls">
                            <label
                              htmlFor={`room-cap-${key}`}
                              className="se-field-caption"
                            >
                              Cupos
                            </label>
                            <input
                              id={`room-cap-${key}`}
                              type="number"
                              min={1}
                              max={2000}
                              className="se-cap-number-input"
                              value={
                                alloc.room.capacity === 0
                                  ? ''
                                  : alloc.room.capacity
                              }
                              onChange={(e) =>
                                handleManualRoomCapacityChange(
                                  key,
                                  e.target.value,
                                )
                              }
                            />
                            <button
                              type="button"
                              className="schedule-exam-rule-delete"
                              onClick={() => handleRemoveManualRoom(key)}
                              aria-label={`Quitar aula ${alloc.room.room_name}`}
                              title="Quitar aula"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* BLOQUE: ASIGNACIÓN DE AUXILIARES DE DOCENCIA (Rotativos para todo el examen) */}
          <section
            className="se-card"
            aria-label="Asignación de Auxiliares de Docencia"
          >
            <div className="se-card-header-row">
              <h3 className="se-card-heading">
                Asignación de Auxiliares de Docencia
              </h3>
              {selectedAuxiliarIds.length > 0 && (
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: '#2563eb',
                    fontWeight: 600,
                  }}
                >
                  {selectedAuxiliarIds.length}{' '}
                  {selectedAuxiliarIds.length === 1
                    ? 'auxiliar asignado'
                    : 'auxiliares asignados'}
                </span>
              )}
            </div>
            <p className="se-helper-text">
              Busca y añade los auxiliares necesarios para este examen. Podrán
              rotar libremente entre las aulas para la supervisión y control de
              acceso en puerta.
            </p>

            {/* Buscador de auxiliares */}
            <div ref={auxDropdownRef} style={{ position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                }}
              >
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    className="schedule-exam-new-rule-input"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      height: '38px',
                      paddingLeft: '32px',
                    }}
                    placeholder="Buscar auxiliar por nombre o correo..."
                    value={auxSearch}
                    onChange={(e) => {
                      setAuxSearch(e.target.value);
                      setIsAuxDropdownOpen(true);
                    }}
                    onFocus={() => setIsAuxDropdownOpen(true)}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '9px',
                      color: '#94a3b8',
                      fontSize: '0.85rem',
                    }}
                  >
                    🔍
                  </span>
                </div>
              </div>

              {/* Menú desplegable con resultados */}
              {isAuxDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 25,
                    marginTop: '4px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                    maxHeight: '190px',
                    overflowY: 'auto',
                  }}
                >
                  {filteredAuxiliaries.length > 0 ? (
                    filteredAuxiliaries.map((aux) => (
                      <div
                        key={aux.user_id}
                        onClick={() => handleAddAuxiliar(aux.user_id)}
                        style={{
                          padding: '8px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = '#f8fafc')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = 'transparent')
                        }
                      >
                        <div>
                          <strong
                            style={{ fontSize: '0.86rem', color: '#0f172a' }}
                          >
                            {aux.full_name}
                          </strong>
                          <div
                            style={{ fontSize: '0.75rem', color: '#64748b' }}
                          >
                            {aux.email}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            color: '#2563eb',
                            fontWeight: 600,
                          }}
                        >
                          + Añadir
                        </span>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        padding: '10px 12px',
                        fontSize: '0.82rem',
                        color: '#64748b',
                      }}
                    >
                      {availableAuxiliaries.length === 0
                        ? 'No hay auxiliares registrados en el sistema.'
                        : 'No se encontraron más auxiliares coincidentes.'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chips de auxiliares asignados */}
            {selectedAuxiliaries.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginTop: '4px',
                }}
              >
                {selectedAuxiliaries.map((aux) => (
                  <div
                    key={aux.user_id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '5px 12px',
                      borderRadius: '20px',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      fontSize: '0.82rem',
                      color: '#1e40af',
                      fontWeight: 500,
                    }}
                  >
                    <span>👤 {aux.full_name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAuxiliar(aux.user_id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        lineHeight: 1,
                        padding: 0,
                        marginLeft: '2px',
                      }}
                      title={`Quitar ${aux.full_name}`}
                      aria-label={`Quitar ${aux.full_name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#64748b',
                  fontStyle: 'italic',
                }}
              >
                Sin auxiliares asignados (el docente supervisará las aulas).
              </div>
            )}
          </section>



          {/* BLOQUE 5: NORMAS GENERALES Y PARTICULARES */}
          <section className="se-card" aria-label="Normas del examen">
            <h3 className="se-card-heading">Normas del examen (opcional)</h3>

            <div className="se-rules-subblock">
              <div className="schedule-exam-spread-row">
                <span className="se-field-label">Normas generales</span>
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
                    onChange={(event) =>
                      setNewGeneralRuleText(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
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

              {generalRules.length > 0 && (
                <div className="schedule-exam-rules-list">
                  {generalRules.map((rule, index) => (
                    <div
                      key={index}
                      className={`schedule-exam-rule-item ${
                        index % 2 === 1 ? 'schedule-exam-rule-pill' : ''
                      }`}
                    >
                      <span>{rule}</span>
                      <button
                        type="button"
                        className="schedule-exam-rule-delete"
                        onClick={() => handleDeleteGeneralRule(index)}
                        aria-label={`Eliminar norma ${rule}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="se-divider" />

            <div className="se-rules-subblock">
              <div className="schedule-exam-spread-row">
                <span className="se-field-label">Normas particulares</span>
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

              {isAddingParticular && (
                <div className="schedule-exam-particular-form">
                  <div className="schedule-exam-input-card">
                    <label
                      htmlFor="particular-student-input"
                      className="schedule-exam-input-card-label"
                    >
                      Estudiante
                    </label>
                    <input
                      id="particular-student-input"
                      type="text"
                      className="schedule-exam-input-card-input"
                      placeholder="Código SIS"
                      value={particularSis}
                      onChange={(event) => {
                        setParticularSis(event.target.value);
                        setParticularError(null);
                      }}
                    />
                  </div>

                  <div className="schedule-exam-input-card">
                    <label
                      htmlFor="particular-rule-input"
                      className="schedule-exam-input-card-label"
                    >
                      Norma
                    </label>
                    <input
                      id="particular-rule-input"
                      type="text"
                      className="schedule-exam-input-card-input"
                      placeholder="Norma particular"
                      value={particularRuleText}
                      onChange={(event) => {
                        setParticularRuleText(event.target.value);
                        setParticularError(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void handleVerifyAndAddParticularRule();
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
                      onClick={() => void handleVerifyAndAddParticularRule()}
                    >
                      {isCheckingStudent ? 'Verificando...' : 'Agregar'}
                    </button>
                  </div>
                </div>
              )}

              {particularRules.length > 0 && (
                <div className="schedule-exam-particular-list">
                  {particularRules.map((item, index) => (
                    <div
                      key={`${item.studentId}-${index}`}
                      className="schedule-exam-particular-card"
                    >
                      <div className="schedule-exam-particular-card-content">
                        <div className="schedule-exam-particular-field">
                          <span className="schedule-exam-input-card-label">
                            Estudiante
                          </span>
                          <span className="schedule-exam-particular-val">
                            {item.codigoSis}
                          </span>
                        </div>
                        <div className="schedule-exam-particular-field">
                          <span className="schedule-exam-input-card-label">
                            Norma
                          </span>
                          <span className="schedule-exam-particular-val">
                            {item.rule}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="schedule-exam-rule-delete"
                        onClick={() => handleDeleteParticularRule(index)}
                        aria-label={`Eliminar norma particular para ${item.codigoSis}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {errorMessage && (
          <p className="se-error-banner" role="alert">
            {errorMessage}
          </p>
        )}

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
            onClick={handleSave}
            disabled={
              isSubmitting ||
              !isAssignedTeacher ||
              isStartPast ||
              isEndInvalid ||
              hasInvalidCustomCapacity ||
              selectedRooms.length === 0 ||
              totalCapacity < totalEnrolled
            }
          >
            {isSubmitting
              ? 'Guardando...'
              : saveSuccess
                ? '¡Guardado!'
                : 'Guardar'}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        title="Confirmar programación"
        message={
          <div>
            <p>
              ¿Estás seguro de que deseas programar este examen con los
              siguientes datos?
            </p>
            <div className="confirm-modal-summary-box">
              <div>
                <strong>Materia:</strong> {course.subject_name}{' '}
                {subjectGroups.length > 1 ? (
                  <span>
                    (Grupos:{' '}
                    {subjectGroups
                      .filter((g) =>
                        selectedGroupIds.includes(Number(g.course_group_id)),
                      )
                      .map((g) => g.group_code)
                      .join(', ')}
                    )
                  </span>
                ) : (
                  <span>(Grupo {course.group_code})</span>
                )}
              </div>
              <div>
                <strong>Evaluación:</strong>{' '}
                {selectedExamType?.label ?? 'Examen'}
              </div>
              <div>
                <strong>Fecha:</strong> {formatDateToSpanish(rawDate)}
              </div>
              <div>
                <strong>Horario:</strong> {formatTime12h(startTime)} -{' '}
                {formatTime12h(endTime)} ({durationLabel})
              </div>
              <div>
                <strong>Aulas:</strong>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {roomAllocations.map((alloc) => (
                    <li
                      key={alloc.room.room_id}
                      style={{ marginBottom: '2px' }}
                    >
                      <strong>{alloc.room.room_name}</strong>:{' '}
                      {alloc.studentCount} estudiantes (cupo:{' '}
                      {alloc.effectiveCapacity})
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Supervisión de Auxiliares:</strong>{' '}
                {selectedAuxiliaries.length > 0 ? (
                  <span>
                    {selectedAuxiliaries.map((a) => a.full_name).join(', ')}{' '}
                    <span style={{ color: '#2563eb', fontSize: '0.85em' }}>
                      (rotación en todas las aulas)
                    </span>
                  </span>
                ) : (
                  <span style={{ color: '#059669' }}>
                    Docente titular supervisa
                  </span>
                )}
              </div>
              <div>
                <strong>Estudiantes:</strong> {totalEnrolled} asignados
              </div>
            </div>
          </div>
        }
        confirmLabel="Sí, programar examen"
        cancelLabel="Volver a revisar"
        isLoading={isSubmitting}
        onConfirm={executeSave}
        onCancel={() => setIsConfirmModalOpen(false)}
      />
    </BottomDrawer>
  );
}
