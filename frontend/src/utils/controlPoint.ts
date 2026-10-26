import type { ControlPointExam, ControlPointRoom } from '../types/controlPoint';
import { normalizeText } from './searchHelper.ts';

export type ControlPointExamStatus = 'En curso' | 'Próximamente' | 'Finalizado' | 'Sin horario';

export interface ControlPointFilters {
  search: string;
  type: string;
  status: string;
  term: string;
}

export function canUseControlPoint(room: ControlPointRoom, userId: number): boolean {
  return room.can_interact === true && Number(room.assistant_id) === userId;
}

export function getControlPointStatus(exam: ControlPointExam, now = Date.now()): ControlPointExamStatus {
  // Exam times are expressed in Bolivia local time, independent of the browser timezone.
  const start = Date.parse(`${exam.date}T${exam.start_time}-04:00`);
  let end = Date.parse(`${exam.date}T${exam.end_time}-04:00`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'Sin horario';
  if (end < start) end += 24 * 60 * 60 * 1000;
  if (now < start) return 'Próximamente';
  return now < end ? 'En curso' : 'Finalizado';
}

export function filterControlPointExams(
  exams: ControlPointExam[], filters: ControlPointFilters,
  terms: Map<string, string>, now = Date.now(),
): ControlPointExam[] {
  const words = normalizeText(filters.search).split(' ').filter(Boolean);
  return exams.filter((exam) => {
    if (filters.type && exam.exam_type.toUpperCase().trim() !== filters.type) return false;
    if (filters.status && getControlPointStatus(exam, now) !== filters.status) return false;
    if (filters.term && terms.get(exam.course_group_id) !== filters.term) return false;
    const text = normalizeText(`${exam.subject_name} ${exam.group} ${exam.exam_type} ${exam.rooms.map((room) => room.room_name).join(' ')}`);
    return words.every((word) => text.includes(word));
  });
}

export function abbreviateExamType(type: string): string {
  const names: Record<string, string> = {
    'PRIMER PARCIAL': '1P', 'SEGUNDO PARCIAL': '2P',
    'EXAMEN FINAL': 'EF', 'SEGUNDA INSTANCIA': 'SI', 'EXAMEN DE MESA': 'EM',
  };
  return names[type.toUpperCase().trim()] ?? type;
}
