import { apiRequest } from './apiClient';
import type { AvailableRoom } from '../types/exam';
import type {
  AcceptSharedExamPayload,
  SharedExamItem,
} from '../types/sharedExam';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const sharedExamService = {
  /**
   * Obtiene los exámenes compartidos activos en los que participa el docente.
   */
  async getSharedExams(): Promise<SharedExamItem[]> {
    const response = await apiRequest<ApiResponse<SharedExamItem[]>>(
      '/shared-exams',
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Compatibilidad: Obtiene invitaciones.
   */
  async getInvitations(status?: string): Promise<SharedExamItem[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const response = await apiRequest<ApiResponse<SharedExamItem[]>>(
      `/shared-exams/invitations${query}`,
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Obtiene las aulas libres durante el horario de este examen compartido.
   */
  async getAvailableRooms(sharedExamId: number): Promise<AvailableRoom[]> {
    const response = await apiRequest<ApiResponse<AvailableRoom[]>>(
      `/shared-exams/${sharedExamId}/available-rooms`,
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Modifica la asignación de grupo de estudiantes y aulas adicionales para el examen compartido.
   */
  async updateAllocation(
    sharedExamId: number,
    payload: AcceptSharedExamPayload,
  ): Promise<ApiResponse<unknown>> {
    return apiRequest<ApiResponse<unknown>>(
      `/shared-exams/${sharedExamId}/allocation`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
  },

  /**
   * Compatibilidad: Acepta invitación.
   */
  async acceptInvitation(
    invitationId: number,
    payload: AcceptSharedExamPayload,
  ): Promise<ApiResponse<unknown>> {
    return this.updateAllocation(invitationId, payload);
  },
};
