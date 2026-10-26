import { API_BASE_URL, apiRequest, createApiHeaders } from './apiClient';
import type { ApiResponse } from '../types/auth';
import type { CourseGroup, EnrolledStudent } from '../types/course';
import type { CatalogItem } from './catalogService';
import type {
  CheckAccessPayload,
  ControlPointExam,
  ExamAccessResponse,
  ObservationPayload,
  ObservationResponse,
} from '../types/controlPoint';

export class ControlPointApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ControlPointApiError';
    this.status = status;
  }
}

// This module preserves domain responses such as a student not found (404),
// without changing error handling for the existing application services.
async function post<T>(endpoint: string, payload: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: createApiHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
    signal,
  });
  const json = await response.json();

  if (endpoint === '/exam-access/check' && response.status === 404 &&
      json.data?.access?.result === 'ESTUDIANTE NO ENCONTRADO') {
    return json as T;
  }

  if (!response.ok || json.success === false) {
    const validationMessage = Object.values(json.errors ?? {})
      .flat().find((value) => typeof value === 'string');
    throw new ControlPointApiError(
      String(validationMessage ?? json.message ?? 'No se pudo completar la solicitud.'),
      response.status,
    );
  }

  return json as T;
}

export const controlPointService = {
  async getExamTypes(signal?: AbortSignal): Promise<CatalogItem[]> {
    const response = await apiRequest<ApiResponse<CatalogItem[]>>('/catalog/exam-types', { signal });
    return response.data;
  },

  async getExams(signal?: AbortSignal): Promise<ControlPointExam[]> {
    const response = await apiRequest<ApiResponse<ControlPointExam[]>>('/exams', { signal });
    return response.data;
  },

  async getCourseGroups(signal?: AbortSignal): Promise<CourseGroup[]> {
    const response = await apiRequest<ApiResponse<CourseGroup[]>>('/course-groups', { signal });
    return response.data;
  },

  async getStudents(courseGroupId: string, signal?: AbortSignal): Promise<EnrolledStudent[]> {
    const response = await apiRequest<ApiResponse<EnrolledStudent[]>>(
      `/courses/${encodeURIComponent(courseGroupId)}/students`, { signal },
    );
    return response.data;
  },

  checkAccess(payload: CheckAccessPayload, signal?: AbortSignal): Promise<ExamAccessResponse> {
    return post('/exam-access/check', { ...payload, identifier: payload.identifier.trim() }, signal);
  },

  saveObservation(payload: ObservationPayload): Promise<ObservationResponse> {
    return post('/exam-access/observations', {
      ...payload,
      identifier: payload.identifier.trim(),
      observation: payload.observation.trim(),
    });
  },
};
