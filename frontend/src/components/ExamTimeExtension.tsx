
import { useEffect, useState } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { controlPointService } from '../services/controlPointService';
import { authService } from '../services/authService';

interface Props {
  examId: number;
  courseGroupId: string;
  examDate: string;
  startTime: string;
  endTime: string;
  onExtended: (newEndTime: string) => void;
}

export function ExamTimeExtension({
  examId,
  courseGroupId,
  examDate,
  startTime,
  endTime,
  onExtended,
}: Props) {
  const [isTeacher, setIsTeacher] = useState(false);
  const [checking, setChecking] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentEnd, setCurrentEnd] = useState(endTime);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setCurrentEnd(endTime);
  }, [endTime]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 10000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;

    const verifyTeacher = async () => {
      try {
        const session = authService.getStoredSession();
        const groups = await controlPointService.getCourseGroups();
        const group = groups.find(
          item => String(item.course_group_id) === String(courseGroupId)
        );

        if (active) {
          setIsTeacher(
            Boolean(
              session &&
              group &&
              Number(group.teacher_id) === Number(session.user_id)
            )
          );
        }
      } catch {
        if (active) setIsTeacher(false);
      } finally {
        if (active) setChecking(false);
      }
    };

    void verifyTeacher();

    return () => {
      active = false;
    };
  }, [courseGroupId]);

  const start = new Date(`${examDate}T${startTime}-04:00`).getTime();
  const finish = new Date(`${examDate}T${currentEnd}-04:00`).getTime();
  const tolerance = 15 * 60 * 1000;

  const validDates = Number.isFinite(start) && Number.isFinite(finish);

  const canExtend =
    validDates &&
    now >= start &&
    now < finish + tolerance;

  const formatTime = (value: string) => value.slice(0, 5);

  const addMinutes = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number);
    const total = hours * 60 + minutes + 15;

    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`;
  };

  const openConfirmation = async () => {
    setError('');
    setSuccess('');

    try {
      // Recupera la última hora registrada en el backend.
      const exams = await controlPointService.getExams();
      const updatedExam = exams.find(
        item => Number(item.exam_id) === examId
      );

      if (!updatedExam) {
        throw new Error('No se encontró el examen.');
      }

      setCurrentEnd(updatedExam.end_time);
      onExtended(updatedExam.end_time);

      const currentFinish = new Date(
        `${examDate}T${updatedExam.end_time}-04:00`
      ).getTime();

      const current = Date.now();

      if (current < start || current >= currentFinish + tolerance) {
        throw new Error(
          'El examen está fuera del plazo permitido para ampliar el tiempo.'
        );
      }

      setConfirming(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo consultar el examen.'
      );
    }
  };

  const confirmExtension = async () => {
    if (saving) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const result = await controlPointService.extendExamTime(examId);

      setCurrentEnd(result.newEndTime);
      onExtended(result.newEndTime);
      setConfirming(false);

      setSuccess(
        `Tiempo ampliado correctamente. Nueva finalización: ${formatTime(result.newEndTime)}.`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo ampliar el tiempo.'
      );
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  // Los auxiliares no ven el botón.
  if (checking || !isTeacher) return null;

  return (
    <section className="exam-time-extension">
      <div className="exam-time-extension-info">
        <span>Finalización del examen</span>
        <strong>{formatTime(currentEnd)}</strong>
      </div>

      <button
        type="button"
        className="exam-time-extension-button"
        disabled={!canExtend || saving}
        onClick={() => void openConfirmation()}
      >
        Aumentar +15 minutos
      </button>

      {!canExtend && (
        <p className="exam-time-extension-warning">
          Ampliación no disponible fuera del horario permitido.
        </p>
      )}

      {error && <p className="exam-time-extension-error" role="alert">{error}</p>}
      {success && <p className="exam-time-extension-success" role="status">{success}</p>}

      <ConfirmModal
        isOpen={confirming}
        title="Confirmar ampliación de tiempo"
        message={
          <div>
            <p>¿Confirmas aumentar 15 minutos al tiempo del examen?</p>
            <p>Finalización actual: <strong>{formatTime(currentEnd)}</strong></p>
            <p>Nueva finalización: <strong>{formatTime(addMinutes(currentEnd))}</strong></p>
            <p>Esta acción quedará registrada con tu usuario.</p>
          </div>
        }
        confirmLabel="Confirmar aumento"
        cancelLabel="Cancelar"
        isLoading={saving}
        onConfirm={() => void confirmExtension()}
        onCancel={() => {
          if (!saving) setConfirming(false);
        }}
      />
    </section>
  );
}
