import type { ControlPointExam, ControlPointRoom, ExamAccessResponse } from '../types/controlPoint';
import { normalizeText } from './searchHelper.ts';
import type { EnrolledStudent } from '../types/course';

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

export function filterControlPointStudents(students: EnrolledStudent[], search: string): EnrolledStudent[] {
  const words = normalizeText(search).split(' ').filter(Boolean);
  if (words.length === 0) return students;
  return students.filter((student) => {
    const text = normalizeText(`${student.fullName} ${student.studentKey} ${student.ci}`);
    return words.every((word) => text.includes(word));
  });
}

export function canRecordControlPointObservation(
  response: ExamAccessResponse, students: EnrolledStudent[], roomId: string,
): boolean {
  if (!response.success || !response.data.student ||
      Number(response.data.access.assigned_room_id) !== Number(roomId)) return false;
  if (response.data.access.result === 'HABILITADO') return true;
  // A previous exceptional entry also returns YA REGISTRÓ INGRESO. Only students
  // with current academic eligibility can have an observation saved by this API.
  return response.data.access.result === 'YA REGISTRÓ INGRESO' && students.some((student) =>
    student.userId === response.data.student?.user_id && student.status === 'HABILITADO',
  );
}
