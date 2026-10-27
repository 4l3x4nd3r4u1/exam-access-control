import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { BottomDrawer } from './BottomDrawer';
import { ConfirmModal } from './ConfirmModal';

import { examService } from '../services/examService';
import { courseService } from '../services/courseService';
import { authService } from '../services/authService';

import type {
  TeacherCourse,
  EnrolledStudent,
} from '../types/course';

import type {
  AvailableRoom,
  ExamType,
  ScheduleExamPayload,
} from '../types/exam';

import { suggestOptimalRooms } from '../utils/roomSuggestion';

interface TimeSlot {
  start: string;
  end: string;
  start24h: string;
}

const TIME_SLOTS: TimeSlot[] = [
  {
    start: '06:45 am',
    end: '08:15 am',
    start24h: '06:45',
  },
  {
    start: '08:15 am',
    end: '09:45 am',
    start24h: '08:15',
  },
  {
    start: '09:45 am',
    end: '11:15 am',
    start24h: '09:45',
  },
  {
    start: '11:15 am',
    end: '12:45 pm',
    start24h: '11:15',
  },
  {
    start: '12:45 pm',
    end: '02:15 pm',
    start24h: '12:45',
  },
  {
    start: '02:15 pm',
    end: '03:45 pm',
    start24h: '14:15',
  },
  {
    start: '03:45 pm',
    end: '05:15 pm',
    start24h: '15:45',
  },
  {
    start: '05:15 pm',
    end: '06:45 pm',
    start24h: '17:15',
  },
  {
    start: '06:45 pm',
    end: '08:15 pm',
    start24h: '18:45',
  },
  {
    start: '08:15 pm',
    end: '09:45 pm',
    start24h: '20:15',
  },
];

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

interface ScheduleExamDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  course: TeacherCourse;
  onSaved?: (
    data: ScheduledExamData,
  ) => void;
}

function getLocalToday(): string {
  const today = new Date();

  const year = today.getFullYear();

  const month = String(
    today.getMonth() + 1,
  ).padStart(2, '0');

  const day = String(
    today.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateToSpanish(
  dateString: string,
): string {
  if (!dateString) {
    return '';
  }

  const [year, month, day] =
    dateString.split('-').map(Number);

  const date = new Date(
    year,
    month - 1,
    day,
  );

  const formatted =
    date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  return (
    formatted.charAt(0).toUpperCase() +
    formatted.slice(1)
  );
}

function getDaysInMonth(
  year: number,
  month: number,
): number {
  return new Date(
    year,
    month + 1,
    0,
  ).getDate();
}

function getFirstDayOfWeek(
  year: number,
  month: number,
): number {
  return new Date(
    year,
    month,
    1,
  ).getDay();
}

export function ScheduleExamDrawer({
  isOpen,
  onClose,
  course,
  onSaved,
}: ScheduleExamDrawerProps) {
  const [
    examTypes,
    setExamTypes,
  ] = useState<ExamType[]>([]);

  const [
    selectedExamTypeId,
    setSelectedExamTypeId,
  ] = useState<number | null>(null);

  const [
    isLoadingExamTypes,
    setIsLoadingExamTypes,
  ] = useState(false);

  const [rawDate, setRawDate] =
    useState(getLocalToday);

  const [
    startTimeIndex,
    setStartTimeIndex,
  ] = useState(0);

  const [
    isCalendarOpen,
    setIsCalendarOpen,
  ] = useState(false);

  const [
    calendarYear,
    setCalendarYear,
  ] = useState(
    () => new Date().getFullYear(),
  );

  const [
    calendarMonth,
    setCalendarMonth,
  ] = useState(
    () => new Date().getMonth(),
  );

  const [
    enrolledStudents,
    setEnrolledStudents,
  ] = useState<EnrolledStudent[]>([]);

  const [
    availableRooms,
    setAvailableRooms,
  ] = useState<AvailableRoom[]>([]);

  const [
    selectedRoomIds,
    setSelectedRoomIds,
  ] = useState<Array<string | number>>(
    [],
  );

  const [
    hasManuallyChangedRooms,
    setHasManuallyChangedRooms,
  ] = useState(false);

  const [
    isLoadingRooms,
    setIsLoadingRooms,
  ] = useState(false);

  const [
    isRoomsOpen,
    setIsRoomsOpen,
  ] = useState(false);

  const [
    generalRules,
    setGeneralRules,
  ] = useState<string[]>([]);

  const [
    isAddingGeneralRule,
    setIsAddingGeneralRule,
  ] = useState(false);

  const [
    newGeneralRuleText,
    setNewGeneralRuleText,
  ] = useState('');

  const [
    particularRules,
    setParticularRules,
  ] = useState<ParticularRule[]>([]);

  const [
    isAddingParticular,
    setIsAddingParticular,
  ] = useState(false);

  const [
    particularSis,
    setParticularSis,
  ] = useState('');

  const [
    particularRuleText,
    setParticularRuleText,
  ] = useState('');

  const [
    particularError,
    setParticularError,
  ] = useState<string | null>(null);

  const [
    isCheckingStudent,
    setIsCheckingStudent,
  ] = useState(false);

  const [
    saveSuccess,
    setSaveSuccess,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    isConfirmModalOpen,
    setIsConfirmModalOpen,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  const currentSession = authService.getStoredSession();
  const isAssignedTeacher =
    course.can_interact ??
    (currentSession && course.teacher_id ? course.teacher_id === currentSession.user_id : true);

  const currentSlot =
    TIME_SLOTS[startTimeIndex] ||
    TIME_SLOTS[0];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setHasManuallyChangedRooms(false);

    let isMounted = true;

    setIsLoadingExamTypes(true);

    examService
      .getExamTypes()
      .then((types) => {
        if (!isMounted) {
          return;
        }

        setExamTypes(types);

        if (types.length > 0) {
          setSelectedExamTypeId(
            (current) =>
              current ??
              types[0].value,
          );
        }
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setExamTypes([]);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar los tipos de examen.',
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingExamTypes(
            false,
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (
      !isOpen ||
      !course.course_group_id
    ) {
      return;
    }

    let isMounted = true;

    courseService
      .getEnrolledStudents(
        String(
          course.course_group_id,
        ),
      )
      .then((students) => {
        if (isMounted) {
          const list = students || [];
          setEnrolledStudents(list);

          if (!hasManuallyChangedRooms && availableRooms.length > 0) {
            const suggestion = suggestOptimalRooms(
              availableRooms,
              list.length,
            );
            setSelectedRoomIds(
              suggestion.suggestedRoomIds,
            );
          }
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
  }, [
    isOpen,
    course.course_group_id,
    hasManuallyChangedRooms,
    availableRooms,
  ]);

  useEffect(() => {
    if (
      !isOpen ||
      !rawDate ||
      !currentSlot.start24h
    ) {
      return;
    }

    let isMounted = true;

    setIsLoadingRooms(true);

    examService
      .getAvailableRooms(
        rawDate,
        currentSlot.start24h,
      )
      .then((rooms) => {
        if (!isMounted) {
          return;
        }

        setAvailableRooms(rooms);

        const targetCount =
          enrolledStudents.length > 0
            ? enrolledStudents.length
            : Number(course.total_enrolled || 0);

        if (
          !hasManuallyChangedRooms ||
          selectedRoomIds.length === 0
        ) {
          const suggestion = suggestOptimalRooms(
            rooms,
            targetCount,
          );
          setSelectedRoomIds(
            suggestion.suggestedRoomIds,
          );
        } else {
          setSelectedRoomIds(
            (current) =>
              current.filter(
                (roomId) =>
                  rooms.some(
                    (room) =>
                      String(
                        room.room_id,
                      ) ===
                      String(roomId),
                  ),
              ),
          );
        }
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setAvailableRooms([]);
        setSelectedRoomIds([]);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar las aulas disponibles.',
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingRooms(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    isOpen,
    rawDate,
    currentSlot.start24h,
  ]);

  const selectedRooms =
    useMemo(() => {
      return availableRooms
        .filter((room) =>
          selectedRoomIds.some(
            (id) =>
              String(id) ===
              String(room.room_id),
          ),
        )
        .sort(
          (a, b) =>
            b.capacity -
            a.capacity,
        );
    }, [
      availableRooms,
      selectedRoomIds,
    ]);

  const totalEnrolled =
    enrolledStudents.length > 0
      ? enrolledStudents.length
      : course.total_enrolled ?? 0;

  const totalCapacity =
    useMemo(() => {
      return selectedRooms.reduce(
        (sum, room) =>
          sum + room.capacity,
        0,
      );
    }, [selectedRooms]);

  const roomAllocations =
    useMemo(() => {
      let remainingCount =
        totalEnrolled;

      let studentOffset = 0;

      const allocations: Array<{
        room: AvailableRoom;
        studentCount: number;
        studentUserIds: number[];
      }> = [];

      for (
        const room of selectedRooms
      ) {
        const studentCount =
          Math.min(
            room.capacity,
            remainingCount,
          );

        const students =
          enrolledStudents.slice(
            studentOffset,
            studentOffset +
              studentCount,
          );

        allocations.push({
          room,
          studentCount,
          studentUserIds:
            students.map(
              (student) =>
                student.userId,
            ),
        });

        studentOffset +=
          studentCount;

        remainingCount =
          Math.max(
            0,
            remainingCount -
              studentCount,
          );
      }

      return allocations;
    }, [
      selectedRooms,
      totalEnrolled,
      enrolledStudents,
    ]);

  const distributionSummary =
    useMemo(() => {
      if (
        roomAllocations.length === 0
      ) {
        return '';
      }

      return roomAllocations
        .map(
          (allocation) =>
            `${allocation.studentCount} alumnos en ${allocation.room.room_name}`,
        )
        .join(', ');
    }, [roomAllocations]);

  const roomsSummary =
    useMemo(() => {
      return selectedRooms
        .map(
          (room) =>
            room.room_name,
        )
        .join(', ');
    }, [selectedRooms]);

  const selectedExamType =
    useMemo(() => {
      return examTypes.find(
        (item) =>
          item.value ===
          selectedExamTypeId,
      );
    }, [
      examTypes,
      selectedExamTypeId,
    ]);

  const optimalSuggestion = useMemo(() => {
    return suggestOptimalRooms(availableRooms, totalEnrolled);
  }, [availableRooms, totalEnrolled]);

  const isCurrentSelectionOptimal = useMemo(() => {
    if (
      optimalSuggestion.suggestedRoomIds.length !== selectedRoomIds.length ||
      optimalSuggestion.suggestedRoomIds.length === 0
    ) {
      return false;
    }
    const currentSet = new Set(selectedRoomIds.map(String));
    return optimalSuggestion.suggestedRoomIds.every((id) =>
      currentSet.has(String(id)),
    );
  }, [optimalSuggestion.suggestedRoomIds, selectedRoomIds]);

  const handleApplyOptimalSuggestion = () => {
    const suggestion = suggestOptimalRooms(availableRooms, totalEnrolled);
    setSelectedRoomIds(suggestion.suggestedRoomIds);
    setHasManuallyChangedRooms(false);
  };

  const handleToggleRoom = (
    roomId: string | number,
  ) => {
    setHasManuallyChangedRooms(true);
    setSelectedRoomIds(
      (current) => {
        const exists =
          current.some(
            (id) =>
              String(id) ===
              String(roomId),
          );

        if (exists) {
          return current.filter(
            (id) =>
              String(id) !==
              String(roomId),
          );
        }

        return [
          ...current,
          roomId,
        ];
      },
    );
  };

  const handleToggleCalendar =
    () => {
      setIsCalendarOpen(
        (current) => {
          if (
            !current &&
            rawDate
          ) {
            const [year, month] =
              rawDate
                .split('-')
                .map(Number);

            if (
              !Number.isNaN(
                year,
              ) &&
              !Number.isNaN(
                month,
              )
            ) {
              setCalendarYear(
                year,
              );

              setCalendarMonth(
                month - 1,
              );
            }
          }

          return !current;
        },
      );
    };

  const handlePrevMonth = (
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();

    if (calendarMonth === 0) {
      setCalendarMonth(11);

      setCalendarYear(
        (year) => year - 1,
      );

      return;
    }

    setCalendarMonth(
      (month) => month - 1,
    );
  };

  const handleNextMonth = (
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();

    if (calendarMonth === 11) {
      setCalendarMonth(0);

      setCalendarYear(
        (year) => year + 1,
      );

      return;
    }

    setCalendarMonth(
      (month) => month + 1,
    );
  };

  const handleSelectDay = (
    day: number,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();

    const formatted =
      `${calendarYear}-` +
      `${String(
        calendarMonth + 1,
      ).padStart(2, '0')}-` +
      `${String(day).padStart(
        2,
        '0',
      )}`;

    if (
      formatted <
      getLocalToday()
    ) {
      return;
    }

    setRawDate(formatted);
    setIsCalendarOpen(false);
  };

  const handleAddGeneralRule =
    () => {
      const cleanText =
        newGeneralRuleText.trim();

      if (!cleanText) {
        return;
      }

      setGeneralRules(
        (current) => [
          ...current,
          cleanText,
        ],
      );

      setNewGeneralRuleText('');
      setIsAddingGeneralRule(
        false,
      );
    };

  const handleDeleteGeneralRule = (
    index: number,
  ) => {
    setGeneralRules(
      (current) =>
        current.filter(
          (_, itemIndex) =>
            itemIndex !== index,
        ),
    );
  };

  const handleVerifyAndAddParticularRule =
    async () => {
      const sis =
        particularSis.trim();

      const rule =
        particularRuleText.trim();

      if (!sis) {
        setParticularError(
          'Por favor ingresa el código SIS del estudiante.',
        );

        return;
      }

      if (!rule) {
        setParticularError(
          'Por favor ingresa la norma particular.',
        );

        return;
      }

      setIsCheckingStudent(true);
      setParticularError(null);

      try {
        const result =
          await examService.checkStudentEnrollment(
            course.course_group_id,
            sis,
          );

        if (
          !result.success ||
          !result.data
        ) {
          setParticularError(
            'El estudiante no pertenece a esta materia.',
          );

          return;
        }

        const duplicated =
          particularRules.some(
            (item) =>
              item.studentId ===
                result.data
                  ?.user_id &&
              item.rule === rule,
          );

        if (duplicated) {
          setParticularError(
            'Esta norma particular ya fue agregada para el estudiante.',
          );

          return;
        }

        setParticularRules(
          (current) => [
            ...current,
            {
              studentId:
                result.data!
                  .user_id,
              codigoSis: sis,
              rule,
            },
          ],
        );

        setParticularSis('');
        setParticularRuleText('');
        setIsAddingParticular(
          false,
        );
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

  const handleDeleteParticularRule =
    (index: number) => {
      setParticularRules(
        (current) =>
          current.filter(
            (_, itemIndex) =>
              itemIndex !== index,
          ),
      );
    };

  const handleSave = () => {
    if (!isAssignedTeacher) {
      setErrorMessage(
        'No tienes permiso para programar exámenes en una materia asignada a otro docente.',
      );
      return;
    }

    if (
      selectedExamTypeId === null
    ) {
      setErrorMessage(
        'Debes seleccionar un tipo de examen.',
      );

      return;
    }

    if (
      selectedRooms.length === 0
    ) {
      setErrorMessage(
        'Debes seleccionar al menos un aula para el examen.',
      );

      return;
    }

    if (
      totalCapacity <
      totalEnrolled
    ) {
      setErrorMessage(
        'La capacidad de las aulas seleccionadas no alcanza para todos los estudiantes inscritos.',
      );

      return;
    }

    setErrorMessage(null);
    setIsConfirmModalOpen(true);
  };

  const executeSave = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const roomsPayload =
      roomAllocations.map(
        (allocation) => ({
          roomId: Number(
            allocation.room
              .room_id,
          ),

          students:
            allocation.studentUserIds,

          auxiliarId: null,
        }),
      );

    for (
      const particularRule of
      particularRules
    ) {
      const isAssigned =
        roomsPayload.some(
          (room) =>
            room.students.includes(
              particularRule.studentId,
            ),
        );

      if (
        !isAssigned &&
        roomsPayload.length > 0
      ) {
        roomsPayload[0].students.push(
          particularRule.studentId,
        );
      }
    }

    const payload:
      ScheduleExamPayload = {
      examTypeId:
        selectedExamTypeId!,

      date: rawDate,

      startTime:
        currentSlot.start24h,

      rooms: roomsPayload,

      generalRules,

      studentRules:
        particularRules.map(
          (item) => ({
            studentId:
              item.studentId,

            rule: item.rule,

            codigoSis:
              item.codigoSis,
          }),
        ),
    };

    try {
      await examService.scheduleExam(
        course.course_group_id,
        payload,
      );

      setSaveSuccess(true);
      setIsConfirmModalOpen(false);

      if (onSaved) {
        onSaved({
          tipoExamen:
            selectedExamType
              ?.label ?? '',

          fecha: rawDate,

          horaInicio:
            currentSlot.start,

          duracion: '1h 30min',

          horaFin:
            currentSlot.end,

          aulas:
            selectedRooms.map(
              (room) =>
                room.room_name,
            ),

          normas:
            generalRules,
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
      <div className="schedule-exam-drawer-content">
        <h2 className="schedule-exam-title">
          Programar Examen
        </h2>

        {!isAssignedTeacher && (
          <div
            style={{
              background: '#fde8e8',
              color: '#9b1c1c',
              border: '1px solid #f8b4b4',
              borderRadius: '8px',
              padding: '12px 14px',
              margin: '12px 0',
              fontSize: '13px',
              lineHeight: '1.4',
            }}
          >
            ⚠️ No eres el docente asignado a esta materia. No puedes programar exámenes para otros docentes.
          </div>
        )}

        <div className="schedule-exam-spread-row schedule-exam-info-row">
          <span className="schedule-exam-label">
            Materia:
          </span>

          <span className="schedule-exam-value">
            {course.subject_name}
          </span>
        </div>

        <div className="schedule-exam-spread-row schedule-exam-info-row">
          <span className="schedule-exam-label">
            Grupo:
          </span>

          <span className="schedule-exam-value">
            {course.group_code}
          </span>
        </div>

        <div className="schedule-exam-spread-row schedule-exam-info-row">
          <label
            htmlFor="schedule-exam-type"
            className="schedule-exam-label"
          >
            Tipo de Examen:
          </label>

          <div className="schedule-exam-select-wrapper">
            <select
              id="schedule-exam-type"
              className="schedule-exam-select"
              value={
                selectedExamTypeId ??
                ''
              }
              onChange={(event) =>
                setSelectedExamTypeId(
                  Number(
                    event.target
                      .value,
                  ),
                )
              }
              disabled={
                isLoadingExamTypes ||
                examTypes.length ===
                  0
              }
            >
              {isLoadingExamTypes && (
                <option value="">
                  Cargando tipos...
                </option>
              )}

              {!isLoadingExamTypes &&
                examTypes.length ===
                  0 && (
                  <option value="">
                    Sin tipos
                    disponibles
                  </option>
                )}

              {examTypes.map(
                (examType) => (
                  <option
                    key={
                      examType.value
                    }
                    value={
                      examType.value
                    }
                  >
                    {
                      examType.label
                    }
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        <div className="schedule-exam-section">
          <label
            htmlFor="schedule-exam-date-trigger"
            className="schedule-exam-label"
          >
            Fecha:
          </label>

          <button
            id="schedule-exam-date-trigger"
            type="button"
            className="schedule-exam-date-box"
            onClick={
              handleToggleCalendar
            }
            aria-expanded={
              isCalendarOpen
            }
          >
            <div className="schedule-exam-date-left">
              <svg
                viewBox="0 0 24 24"
                className="schedule-exam-calendar-icon"
                aria-hidden="true"
              >
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="18"
                  rx="2"
                  ry="2"
                />

                <line
                  x1="16"
                  y1="2"
                  x2="16"
                  y2="6"
                />

                <line
                  x1="8"
                  y1="2"
                  x2="8"
                  y2="6"
                />

                <line
                  x1="3"
                  y1="10"
                  x2="21"
                  y2="10"
                />
              </svg>

              <span className="schedule-exam-date-text">
                {formatDateToSpanish(
                  rawDate,
                )}
              </span>
            </div>

            <span
              className="schedule-exam-chevron-circle"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                className={`schedule-exam-chevron-icon ${
                  isCalendarOpen
                    ? 'open'
                    : ''
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
                  onClick={
                    handlePrevMonth
                  }
                  aria-label="Mes anterior"
                >
                  ‹
                </button>

                <span className="schedule-exam-calendar-month-title">
                  {
                    MONTH_NAMES[
                      calendarMonth
                    ]
                  }{' '}
                  {calendarYear}
                </span>

                <button
                  type="button"
                  className="schedule-exam-calendar-nav-btn"
                  onClick={
                    handleNextMonth
                  }
                  aria-label="Mes siguiente"
                >
                  ›
                </button>
              </div>

              <div className="schedule-exam-calendar-weekdays">
                {[
                  'Do',
                  'Lu',
                  'Ma',
                  'Mi',
                  'Ju',
                  'Vi',
                  'Sá',
                ].map((day) => (
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
                  length:
                    getFirstDayOfWeek(
                      calendarYear,
                      calendarMonth,
                    ),
                }).map((_, index) => (
                  <span
                    key={`empty-${index}`}
                    className="schedule-exam-calendar-day empty"
                  />
                ))}

                {Array.from({
                  length:
                    getDaysInMonth(
                      calendarYear,
                      calendarMonth,
                    ),
                }).map((_, index) => {
                  const dayNumber =
                    index + 1;

                  const [
                    currentYear,
                    currentMonth,
                    currentDay,
                  ] = rawDate
                    .split('-')
                    .map(Number);

                  const isSelected =
                    currentYear ===
                      calendarYear &&
                    currentMonth ===
                      calendarMonth +
                        1 &&
                    currentDay ===
                      dayNumber;

                  const candidateDate =
                    `${calendarYear}-` +
                    `${String(
                      calendarMonth +
                        1,
                    ).padStart(
                      2,
                      '0',
                    )}-` +
                    `${String(
                      dayNumber,
                    ).padStart(
                      2,
                      '0',
                    )}`;

                  const isPast =
                    candidateDate <
                    getLocalToday();

                  return (
                    <button
                      key={
                        dayNumber
                      }
                      type="button"
                      className={`schedule-exam-calendar-day ${
                        isSelected
                          ? 'selected'
                          : ''
                      }`}
                      disabled={
                        isPast
                      }
                      onClick={(
                        event,
                      ) =>
                        handleSelectDay(
                          dayNumber,
                          event,
                        )
                      }
                    >
                      {dayNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="schedule-exam-times-block">
          <div className="schedule-exam-spread-row">
            <label
              htmlFor="schedule-exam-start-time"
              className="schedule-exam-label"
            >
              Hora de inicio:
            </label>

            <div className="schedule-exam-select-wrapper">
              <select
                id="schedule-exam-start-time"
                className="schedule-exam-select"
                value={
                  startTimeIndex
                }
                onChange={(event) =>
                  setStartTimeIndex(
                    Number(
                      event.target
                        .value,
                    ),
                  )
                }
              >
                {TIME_SLOTS.map(
                  (
                    slot,
                    index,
                  ) => (
                    <option
                      key={
                        slot.start
                      }
                      value={
                        index
                      }
                    >
                      {
                        slot.start
                      }
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div className="schedule-exam-spread-row">
            <span className="schedule-exam-label">
              Duración
            </span>

            <span className="schedule-exam-value">
              1h 30min
            </span>
          </div>

          <div className="schedule-exam-spread-row">
            <span className="schedule-exam-label">
              Hora de finalización:
            </span>

            <span className="schedule-exam-value schedule-exam-calculated-time">
              {currentSlot.end}
            </span>
          </div>
        </div>

        <div className="schedule-exam-section">
          <button
            type="button"
            className="schedule-exam-spread-row schedule-exam-accordion-header"
            onClick={() =>
              setIsRoomsOpen(
                !isRoomsOpen,
              )
            }
            aria-expanded={
              isRoomsOpen
            }
          >
            <div className="schedule-exam-label-with-arrow">
              <span className="schedule-exam-label">
                Aulas:
              </span>

              <span
                className={`schedule-exam-arrow-indicator ${
                  isRoomsOpen
                    ? 'open'
                    : ''
                }`}
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="#000"
                  strokeWidth="2.5"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>

            <span className="schedule-exam-value schedule-exam-aulas-summary">
              {roomsSummary ||
                'Ninguna seleccionada'}
            </span>
          </button>

          {distributionSummary && (
            <p className="schedule-exam-distribution-text">
              {
                distributionSummary
              }
            </p>
          )}

          <p className="schedule-exam-subtext">
            {totalCapacity} plazas
            para {totalEnrolled}{' '}
            inscritos

            {totalCapacity <
              totalEnrolled && (
              <span className="schedule-exam-capacity-warning">
                {' '}
                (Faltan{' '}
                {totalEnrolled -
                  totalCapacity}{' '}
                cupos)
              </span>
            )}

            {isCurrentSelectionOptimal &&
              selectedRooms.length > 0 && (
                <span className="schedule-exam-capacity-suggested-tag">
                  {' '}• Sugerencia óptima automática
                </span>
              )}
          </p>

          {isRoomsOpen && (
            <div
              className="schedule-exam-dropdown-panel"
              role="region"
              aria-label="Selección de aulas"
            >
              <div className="schedule-exam-auto-suggest-header">
                <span className="schedule-exam-panel-tip">
                  {isCurrentSelectionOptimal
                    ? '✨ Aulas sugeridas automáticamente según capacidad:'
                    : 'Selecciona las aulas para este examen:'}
                </span>

                {!isCurrentSelectionOptimal &&
                  availableRooms.length > 0 && (
                    <button
                      type="button"
                      className="schedule-exam-suggest-action-btn"
                      onClick={
                        handleApplyOptimalSuggestion
                      }
                      title="Restablecer la selección óptima calculada por el sistema"
                    >
                      ⚡ Restablecer sugerencia óptima
                    </button>
                  )}
              </div>

              {isLoadingRooms ? (
                <p className="schedule-exam-empty-rules">
                  Cargando aulas
                  disponibles...
                </p>
              ) : availableRooms.length ===
                0 ? (
                <p className="schedule-exam-empty-rules">
                  No hay aulas
                  disponibles para la
                  fecha y hora
                  seleccionadas.
                </p>
              ) : (
                <div className="schedule-exam-classrooms-grid">
                  {availableRooms.map(
                    (room) => {
                      const isChecked =
                        selectedRoomIds.some(
                          (id) =>
                            String(
                              id,
                            ) ===
                            String(
                              room.room_id,
                            ),
                        );

                      const isSuggested =
                        optimalSuggestion.suggestedRoomIds.some(
                          (id) =>
                            String(
                              id,
                            ) ===
                            String(
                              room.room_id,
                            ),
                        );

                      return (
                        <button
                          key={
                            room.room_id
                          }
                          type="button"
                          className={`schedule-exam-room-pill ${
                            isChecked
                              ? 'selected'
                              : ''
                          } ${
                            isSuggested
                              ? 'suggested-pill'
                              : ''
                          }`}
                          onClick={() =>
                            handleToggleRoom(
                              room.room_id,
                            )
                          }
                          title={
                            isSuggested
                              ? 'Aula sugerida por el sistema para optimizar capacidad'
                              : undefined
                          }
                        >
                          <span className="schedule-exam-room-check">
                            {isChecked
                              ? '✓'
                              : '+'}
                          </span>

                          <span className="schedule-exam-room-name">
                            {
                              room.room_name
                            }
                          </span>

                          <span className="schedule-exam-room-cap">
                            (
                            {
                              room.capacity
                            }
                            )
                          </span>

                          {isSuggested && (
                            <span className="schedule-exam-room-star-tag">
                              Sugerida
                            </span>
                          )}
                        </button>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="schedule-exam-section schedule-exam-rules-section">
          <div className="schedule-exam-spread-row">
            <span className="schedule-exam-label schedule-exam-bold-label">
              Normas generales
            </span>

            <button
              type="button"
              className="schedule-exam-add-rule-btn"
              onClick={() =>
                setIsAddingGeneralRule(
                  !isAddingGeneralRule,
                )
              }
              aria-label="Agregar norma general"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <line
                  x1="12"
                  y1="5"
                  x2="12"
                  y2="19"
                />

                <line
                  x1="5"
                  y1="12"
                  x2="19"
                  y2="12"
                />
              </svg>
            </button>
          </div>

          {isAddingGeneralRule && (
            <div className="schedule-exam-new-rule-box">
              <input
                type="text"
                className="schedule-exam-new-rule-input"
                placeholder="Escribe la nueva norma general..."
                value={
                  newGeneralRuleText
                }
                onChange={(event) =>
                  setNewGeneralRuleText(
                    event.target
                      .value,
                  )
                }
                onKeyDown={(
                  event,
                ) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
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
                    setIsAddingGeneralRule(
                      false,
                    );

                    setNewGeneralRuleText(
                      '',
                    );
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="schedule-exam-new-rule-submit"
                  onClick={
                    handleAddGeneralRule
                  }
                >
                  Agregar
                </button>
              </div>
            </div>
          )}

          <div className="schedule-exam-rules-list">
            {generalRules.length ===
            0 ? (
              <p className="schedule-exam-empty-rules">
                No hay normas
                generales agregadas.
                Presiona (+) para
                agregar una.
              </p>
            ) : (
              generalRules.map(
                (
                  rule,
                  index,
                ) => (
                  <div
                    key={
                      index
                    }
                    className={`schedule-exam-rule-item ${
                      index % 2 ===
                      1
                        ? 'schedule-exam-rule-pill'
                        : ''
                    }`}
                  >
                    <span>
                      {rule}
                    </span>

                    <button
                      type="button"
                      className="schedule-exam-rule-delete"
                      onClick={() =>
                        handleDeleteGeneralRule(
                          index,
                        )
                      }
                      aria-label={`Eliminar norma ${rule}`}
                    >
                      ×
                    </button>
                  </div>
                ),
              )
            )}
          </div>
        </div>

        <div className="schedule-exam-section schedule-exam-rules-section">
          <div className="schedule-exam-spread-row">
            <span className="schedule-exam-label schedule-exam-bold-label">
              Normas particulares
            </span>

            <button
              type="button"
              className="schedule-exam-add-rule-btn"
              onClick={() => {
                setIsAddingParticular(
                  !isAddingParticular,
                );

                setParticularError(
                  null,
                );
              }}
              aria-label="Agregar norma particular"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <line
                  x1="12"
                  y1="5"
                  x2="12"
                  y2="19"
                />

                <line
                  x1="5"
                  y1="12"
                  x2="19"
                  y2="12"
                />
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
                  value={
                    particularSis
                  }
                  onChange={(
                    event,
                  ) => {
                    setParticularSis(
                      event.target
                        .value,
                    );

                    setParticularError(
                      null,
                    );
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
                  value={
                    particularRuleText
                  }
                  onChange={(
                    event,
                  ) => {
                    setParticularRuleText(
                      event.target
                        .value,
                    );

                    setParticularError(
                      null,
                    );
                  }}
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                      'Enter'
                    ) {
                      event.preventDefault();

                      handleVerifyAndAddParticularRule();
                    }
                  }}
                />
              </div>

              {particularError && (
                <p className="schedule-exam-particular-error-msg">
                  {
                    particularError
                  }
                </p>
              )}

              <div className="schedule-exam-particular-actions">
                <button
                  type="button"
                  className="schedule-exam-particular-cancel-btn"
                  onClick={() => {
                    setIsAddingParticular(
                      false,
                    );

                    setParticularSis(
                      '',
                    );

                    setParticularRuleText(
                      '',
                    );

                    setParticularError(
                      null,
                    );
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="schedule-exam-particular-submit-btn"
                  disabled={
                    isCheckingStudent
                  }
                  onClick={
                    handleVerifyAndAddParticularRule
                  }
                >
                  {isCheckingStudent
                    ? 'Verificando...'
                    : 'Agregar'}
                </button>
              </div>
            </div>
          )}

          <div className="schedule-exam-particular-list">
            {particularRules.map(
              (item, index) => (
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
                        {
                          item.codigoSis
                        }
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
                    onClick={() =>
                      handleDeleteParticularRule(
                        index,
                      )
                    }
                    aria-label={`Eliminar norma particular para ${item.codigoSis}`}
                  >
                    ×
                  </button>
                </div>
              ),
            )}
          </div>
        </div>

        {errorMessage && (
          <p
            className="schedule-exam-error"
            style={{
              color: '#d93025',
              fontSize: '13px',
              margin: '8px 0',
              textAlign:
                'center',
            }}
          >
            {errorMessage}
          </p>
        )}

        <div className="schedule-exam-actions">
          <button
            type="button"
            className="schedule-exam-cancel-btn"
            onClick={onClose}
            disabled={
              isSubmitting
            }
          >
            Cancelar
          </button>

          <button
            type="button"
            className="schedule-exam-submit-btn"
            onClick={handleSave}
            disabled={
              isSubmitting || !isAssignedTeacher
            }
          >
            {isSubmitting
              ? 'Guardando...'
              : saveSuccess
                ? '¡Guardado!'
                : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        title="Confirmar programación"
        message={
          <div>
            <p>¿Estás seguro de que deseas programar este examen con los siguientes datos?</p>
            <div className="confirm-modal-summary-box">
              <div><strong>Materia:</strong> {course.subject_name} (Grupo {course.group_code})</div>
              <div><strong>Evaluación:</strong> {selectedExamType?.label ?? 'Examen'}</div>
              <div><strong>Fecha:</strong> {formatDateToSpanish(rawDate)}</div>
              <div><strong>Horario:</strong> {currentSlot.start} - {currentSlot.end}</div>
              <div><strong>Aulas:</strong> {roomsSummary || 'Ninguna'}</div>
              <div><strong>Estudiantes:</strong> {totalEnrolled} asignados</div>
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