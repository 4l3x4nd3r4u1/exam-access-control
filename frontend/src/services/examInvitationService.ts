import { apiRequest } from './apiClient';
import type { CreateExamInvitationResponse } from '../types/examInvitation';

export const examInvitationService = {
  async inviteTeacher(
    examId: string | number,
    invitedTeacherId: number,
    message: string,
  ): Promise<CreateExamInvitationResponse> {
    return apiRequest<CreateExamInvitationResponse>(
      `/exams/${examId}/invitations`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitedTeacherId, message }),
      },
    );
  },
};
