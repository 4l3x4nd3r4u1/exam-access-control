import type { ScheduledExam } from './exam';
import type { CourseGroup } from './course';

export interface InvitationExamOption {
  exam: ScheduledExam;
  course: CourseGroup;
}

export interface CreateExamInvitationResponse {
  success: boolean;
  message: string;
  data: {
    invitation_id: number;
    mail_sent: boolean;
    mail_status: 'PENDIENTE' | 'ENVIADO' | 'FALLIDO';
    invited_teacher: {
      user_id: number;
      full_name: string;
      email: string;
    };
  };
}
