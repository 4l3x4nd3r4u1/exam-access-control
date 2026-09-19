import type { TeacherSubjectDetail, TeacherSubjectsOverview } from './types';

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

export const getTeacherSubjects = async (
  apiBaseUrl: string,
  token: string,
  signal?: AbortSignal,
): Promise<TeacherSubjectsOverview> => {
  const response = await fetch(`${apiBaseUrl}/teacher/subjects`, {
    headers: authHeaders(token),
    signal,
  });

  return readApiResponse<TeacherSubjectsOverview>(response);
};

export const getTeacherSubjectDetail = async (
  apiBaseUrl: string,
  token: string,
  courseGroupId: string,
  signal?: AbortSignal,
): Promise<TeacherSubjectDetail> => {
  const response = await fetch(`${apiBaseUrl}/teacher/subjects/${encodeURIComponent(courseGroupId)}`, {
    headers: authHeaders(token),
    signal,
  });

  return readApiResponse<TeacherSubjectDetail>(response);
};
