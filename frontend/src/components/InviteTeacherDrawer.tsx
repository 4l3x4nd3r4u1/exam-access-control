import { useEffect, useMemo, useState } from 'react';

import { BottomDrawer } from './BottomDrawer';
import { courseService } from '../services/courseService';
import { examInvitationService } from '../services/examInvitationService';
import { examService } from '../services/examService';
import { staffService } from '../services/staffService';
import type { UserSession } from '../types/auth';
import type { CourseGroup } from '../types/course';
import type { InvitationExamOption } from '../types/examInvitation';
import type { AcademicStaffMember } from '../types/staff';
import { formatExamType, formatTime } from '../utils/examFormat';
import { normalizeText } from '../utils/searchHelper';

type InviteStep = 'EXAM' | 'TEACHER' | 'MESSAGE' | 'RESULT';

interface InviteTeacherDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession;
}

function InviteTeacherContent({
  onClose,
  session,
}: Omit<InviteTeacherDrawerProps, 'isOpen'>) {
  const [step, setStep] = useState<InviteStep>('EXAM');
  const [examOptions, setExamOptions] = useState<InvitationExamOption[]>([]);
  const [teachers, setTeachers] = useState<AcademicStaffMember[]>([]);
  const [selectedExam, setSelectedExam] = useState<InvitationExamOption | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<AcademicStaffMember | null>(null);
  const [examSearch, setExamSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ message: string; mailSent: boolean } | null>(null);

  useEffect(() => {
    let active = true;

    const courseRequest = session.roles.includes('ADMIN')
      ? courseService.getCourseGroups()
      : courseService.getTeacherCourses(session.user_id);

    Promise.all([courseRequest, staffService.getAcademicStaff()])
      .then(async ([courses, staff]) => {
        const invitables = session.roles.includes('ADMIN')
          ? courses
          : courses.filter((course) => course.teacher_id === session.user_id);

        const examsByCourse = await Promise.all(
          invitables.map(async (course: CourseGroup) => {
            const exams = await examService.getScheduledExams(course.course_group_id);
            return exams.map((exam) => ({ exam, course }));
          }),
        );

        if (!active) return;
        setExamOptions(examsByCourse.flat());
        setTeachers(
          staff.filter(
            (member) =>
              member.user_id !== session.user_id &&
              member.roles.includes('DOCENTE') &&
              member.is_active,
          ),
        );
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudieron cargar los datos para la invitación.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.roles, session.user_id]);

  const visibleExams = useMemo(() => {
    const query = normalizeText(examSearch);
    if (!query) return examOptions;

    return examOptions.filter(({ exam, course }) =>
      normalizeText(
        `${course.subject_name} ${course.subject_code} ${course.group_code} ${exam.exam_type}`,
      ).includes(query),
    );
  }, [examOptions, examSearch]);

  const visibleTeachers = useMemo(() => {
    const query = normalizeText(teacherSearch);
    if (!query) return teachers;

    return teachers.filter((teacher) =>
      normalizeText(`${teacher.full_name} ${teacher.email}`).includes(query),
    );
  }, [teacherSearch, teachers]);

  const selectExam = (option: InvitationExamOption) => {
    setSelectedExam(option);
    setError(null);
    setStep('TEACHER');
  };

  const selectTeacher = (teacher: AcademicStaffMember) => {
    setSelectedTeacher(teacher);
    setMessage(`Te invito a colaborar en el examen de ${selectedExam?.course.subject_name ?? 'la materia'}.`);
    setError(null);
    setStep('MESSAGE');
  };

  const submitInvitation = async () => {
    if (!selectedExam || !selectedTeacher || !message.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await examInvitationService.inviteTeacher(
        selectedExam.exam.exam_id,
        selectedTeacher.user_id,
        message.trim(),
      );

      setResult({
        message: response.message,
        mailSent: response.data.mail_sent,
      });
      setStep('RESULT');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo enviar la invitación.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    setError(null);
    if (step === 'TEACHER') setStep('EXAM');
    if (step === 'MESSAGE') setStep('TEACHER');
  };

  return (
    <div className="invite-teacher-flow">
      <header className="invite-teacher-header">
        {step !== 'EXAM' && step !== 'RESULT' ? (
          <button type="button" className="invite-teacher-back" onClick={goBack}>
            Volver
          </button>
        ) : <span />}
        <p>Paso {step === 'EXAM' ? '1' : step === 'TEACHER' ? '2' : step === 'MESSAGE' ? '3' : '3'} de 3</p>
      </header>

      {step === 'EXAM' && (
        <section className="invite-teacher-step" aria-labelledby="invite-exam-title">
          <h2 id="invite-exam-title">Seleccionar examen</h2>
          <p>Elige el examen al que invitarás a otro docente.</p>
          <label className="invite-teacher-search">
            <span className="cg-visually-hidden">Buscar examen</span>
            <input
              type="search"
              value={examSearch}
              onChange={(event) => setExamSearch(event.target.value)}
              placeholder="Buscar materia o examen"
              autoComplete="off"
            />
          </label>

          <div className="invite-teacher-list" role="list" aria-label="Exámenes disponibles">
            {loading && <p className="invite-teacher-feedback">Cargando exámenes...</p>}
            {!loading && !error && visibleExams.length === 0 && (
              <p className="invite-teacher-feedback">No hay exámenes disponibles para invitar docentes.</p>
            )}
            {!loading && visibleExams.map((option) => (
              <button
                type="button"
                role="listitem"
                className="invite-teacher-row"
                key={option.exam.exam_id}
                onClick={() => selectExam(option)}
              >
                <strong>{option.course.subject_name}</strong>
                <span>{formatExamType(option.exam.exam_type)} · G{option.course.group_code}</span>
                <small>{option.exam.date} · {formatTime(option.exam.start_time)}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 'TEACHER' && selectedExam && (
        <section className="invite-teacher-step" aria-labelledby="invite-teacher-title">
          <h2 id="invite-teacher-title">Seleccionar docente</h2>
          <p>Busca un docente activo para el examen de {selectedExam.course.subject_name}.</p>
          <label className="invite-teacher-search">
            <span className="cg-visually-hidden">Buscar docente</span>
            <input
              type="search"
              value={teacherSearch}
              onChange={(event) => setTeacherSearch(event.target.value)}
              placeholder="Buscar docente"
              autoComplete="off"
            />
          </label>
          <div className="invite-teacher-count">Docentes <strong>{visibleTeachers.length}</strong></div>
          <div className="invite-teacher-list" role="list" aria-label="Docentes">
            {visibleTeachers.map((teacher) => (
              <button
                type="button"
                role="listitem"
                className="invite-teacher-row"
                key={teacher.user_id}
                onClick={() => selectTeacher(teacher)}
              >
                <strong>{teacher.full_name}</strong>
                <span>{teacher.email}</span>
              </button>
            ))}
            {visibleTeachers.length === 0 && (
              <p className="invite-teacher-feedback">No se encontraron docentes.</p>
            )}
          </div>
        </section>
      )}

      {step === 'MESSAGE' && selectedExam && selectedTeacher && (
        <section className="invite-teacher-step" aria-labelledby="invite-message-title">
          <h2 id="invite-message-title">Invitar docente</h2>
          <dl className="invite-teacher-summary">
            <div><dt>Docente</dt><dd>{selectedTeacher.full_name}</dd></div>
            <div><dt>Materia</dt><dd>{selectedExam.course.subject_name}</dd></div>
            <div><dt>Examen</dt><dd>{formatExamType(selectedExam.exam.exam_type)}</dd></div>
          </dl>
          <label className="invite-teacher-message">
            <span>Mensaje</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={1000}
              rows={5}
              placeholder="Escribe el mensaje que recibirá el docente"
            />
            <small>{message.length}/1000</small>
          </label>
          <p className="invite-teacher-note">El docente recibirá el correo y tendrá acceso inmediato. No deberá aceptar la invitación.</p>
          <button
            type="button"
            className="invite-teacher-primary"
            onClick={submitInvitation}
            disabled={submitting || !message.trim()}
          >
            {submitting ? 'Enviando...' : 'Mandar invitación'}
          </button>
        </section>
      )}

      {step === 'RESULT' && result && (
        <section className="invite-teacher-result" aria-live="polite">
          <div className={result.mailSent ? 'is-success' : 'is-warning'} aria-hidden="true">
            {result.mailSent ? '✓' : '!'}
          </div>
          <h2>{result.mailSent ? 'Invitación enviada' : 'Invitación registrada'}</h2>
          <p>{result.message}</p>
          <button type="button" className="invite-teacher-primary" onClick={onClose}>
            Finalizar
          </button>
        </section>
      )}

      {error && <p className="invite-teacher-error" role="alert">{error}</p>}

      {step !== 'RESULT' && (
        <button type="button" className="invite-teacher-cancel" onClick={onClose}>
          Cancelar
        </button>
      )}
    </div>
  );
}

export function InviteTeacherDrawer({
  isOpen,
  onClose,
  session,
}: InviteTeacherDrawerProps) {
  return (
    <BottomDrawer
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Invitar docente a examen"
      className="invite-teacher-drawer"
    >
      <InviteTeacherContent onClose={onClose} session={session} />
    </BottomDrawer>
  );
}
