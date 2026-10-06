export interface TeacherCourse {
  course_group_id: string;
  subject_code: string;
  subject_name: string;
  group_code: string;
  academic_term: string;
  total_enrolled: number;
  teacher_id: number;
  can_interact: boolean;
}

export interface TeacherCoursesResponse {
  success: boolean;
  data: TeacherCourse[];
  message: string;
}

export interface EnrolledStudent {
  userId: number;
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

// GET /course-groups devuelve la misma forma que GET /teachers/{id}/courses
export type CourseGroup = TeacherCourse;

export interface CourseGroupsResponse {
  success: boolean;
  data: CourseGroup[];
  message: string;
}
