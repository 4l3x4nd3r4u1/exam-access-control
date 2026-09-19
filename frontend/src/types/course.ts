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
  message: string;
  data: TeacherCourse[];
}
