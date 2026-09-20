import type { TeacherSubject, TeacherSubjectsOverview } from '../types/teacherSubject';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

const authHeaders = (token: string) => ({
  Accept: 'application/json',
  Authorization: `Bearer ${token}`,
});

const readApiResponse = async <T>(response: Response): Promise<T> => {
  const json = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.message || 'No se pudo completar la solicitud.');
  }

  return json.data;
};

type RawTeacherCourse = Record<string, unknown>;

const readStringField = (course: RawTeacherCourse, field: string): string => {
  const value = course[field];
  return typeof value === 'string' ? value : '';
};

const readNumberField = (course: RawTeacherCourse, field: string): number => {
  const value = course[field];
  return typeof value === 'number' ? value : 0;
};

const mapTeacherCourse = (course: RawTeacherCourse): TeacherSubject => ({
  courseGroupId: readStringField(course, 'course_group_id'),
  subjectCode: readStringField(course, 'subject_code'),
  subjectName: readStringField(course, 'subject_name'),
  groupCode: readStringField(course, 'group_code'),
  academicTerm: readStringField(course, 'academic_term'),
  enrolledCount: readNumberField(course, 'total_enrolled'),
  teacherId: readNumberField(course, 'teacher_id'),
});

const buildOverview = (subjects: TeacherSubject[]): TeacherSubjectsOverview => ({
  summary: {
    subjectsCount: subjects.length,
    studentsCount: subjects.reduce((total, subject) => total + subject.enrolledCount, 0),
    academicPeriod: subjects[0]?.academicTerm ?? null,
  },
  subjects,
});

export const getTeacherSubjects = async (
  apiBaseUrl: string,
  token: string,
  teacherId: number,
  signal?: AbortSignal,
): Promise<TeacherSubjectsOverview> => {
  const response = await fetch(`${apiBaseUrl}/teachers/${teacherId}/courses`, {
    headers: authHeaders(token),
    signal,
  });

  const courses = await readApiResponse<RawTeacherCourse[]>(response);
  return buildOverview(courses.map(mapTeacherCourse));
};

export const getTeacherSubject = async (
  apiBaseUrl: string,
  token: string,
  teacherId: number,
  courseGroupId: string,
  signal?: AbortSignal,
): Promise<TeacherSubject> => {
  const overview = await getTeacherSubjects(apiBaseUrl, token, teacherId, signal);
  const subject = overview.subjects.find((item) => item.courseGroupId === courseGroupId);

  if (!subject) {
    throw new Error('No se encontro la materia solicitada.');
  }

  return subject;
};
