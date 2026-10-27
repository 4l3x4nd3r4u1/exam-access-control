import { apiRequest } from './apiClient';

import type {
  ControlExam,
  ControlExamsResponse,
  DuringExamResponse,
  EntryCheckResponse,
} from '../types/examAccess';

function jsonPost(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export const examAccessService = {
  /** Todos los exámenes; `can_interact` marca las aulas que el usuario controla. */
  async getExams(): Promise<ControlExam[]> {
    const response = await apiRequest<ControlExamsResponse>('/exams');
    return Array.isArray(response.data) ? response.data : [];
  },

  /** Verifica y REGISTRA el ingreso (tiene efectos: no llamar al teclear). */
  checkEntry(
    identifier: string,
    examId: string | number,
    roomId: string | number,
  ): Promise<EntryCheckResponse> {
    return apiRequest<EntryCheckResponse>(
      '/exam-access/check',
      jsonPost({
        identifier: identifier.trim(),
        exam_id: Number(examId),
        room_id: Number(roomId),
      }),
    );
  },

  /** Solo consulta el estado actual del estudiante. */
  checkDuringExam(
    identifier: string,
    examId: string | number,
  ): Promise<DuringExamResponse> {
    return apiRequest<DuringExamResponse>(
      '/exam-access/during-exam/check',
      jsonPost({ identifier: identifier.trim(), exam_id: Number(examId) }),
    );
  },

  async registerObservation(
    identifier: string,
    examId: string | number,
    observation: string,
  ): Promise<void> {
    await apiRequest(
      '/exam-access/observations',
      jsonPost({
        identifier: identifier.trim(),
        exam_id: Number(examId),
        observation: observation.trim(),
      }),
    );
  },

  async registerExceptionalEntry(
    identifier: string,
    examId: string | number,
    observation: string,
  ): Promise<void> {
    await apiRequest(
      '/exam-access/exceptional-entry',
      jsonPost({
        identifier: identifier.trim(),
        exam_id: Number(examId),
        observation: observation.trim(),
      }),
    );
  },

  async registerExpulsion(
    identifier: string,
    examId: string | number,
    reason: string,
  ): Promise<void> {
    await apiRequest(
      '/exam-access/expulsion',
      jsonPost({
        identifier: identifier.trim(),
        exam_id: Number(examId),
        reason: reason.trim(),
      }),
    );
  },
};
