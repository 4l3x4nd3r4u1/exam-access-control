export interface TeacherCourse {
  course_group_id: string;
  subject_code: string;
  subject_name: string;
  group_code: string;
  academic_term: string;
  total_enrolled: number;
  teacher_id: number;
}

export interface TeacherCoursesResponse {
  success: boolean;
  data: TeacherCourse[];
  message: string;
}

export interface EnrolledStudent {
  studentKey: string;
  ci: string;
  fullName: string;
  status: 'HABILITADO' | 'INHABILITADO';
  ineligibilityReason: string | null;
}

export interface EnrolledStudentsResponse {
  success: boolean;
  data: EnrolledStudent[];
  message: string;
}
