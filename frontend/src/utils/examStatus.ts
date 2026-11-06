import type {
  ControlExam,
  ControlExamStatus,
} from '../types/examAccess';

function toDate(date: string, time: string): Date {
  return new Date(`${date}T${time.length === 5 ? `${time}:00` : time}`);
}

/** Estado del examen según su fecha y horario (hora local del dispositivo). */
export function getExamStatus(
  exam: Pick<ControlExam, 'date' | 'start_time' | 'end_time'>,
  now: Date = new Date(),
): ControlExamStatus {
  const start = toDate(exam.date, exam.start_time);
  const end = toDate(exam.date, exam.end_time);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'PROXIMAMENTE';
  }
  if (now < start) return 'PROXIMAMENTE';
  if (now > end) return 'FINALIZADO';
  return 'EN_CURSO';
}

export const EXAM_STATUS_LABEL: Record<ControlExamStatus, string> = {
  EN_CURSO: 'En Curso',
  PROXIMAMENTE: 'Próximamente',
  FINALIZADO: 'Finalizado',
};
