export interface TeacherSubject {
  course_group_id: string;
  subject_code: string;
  subject_name: string;
  group_code: string;
  academic_term: string;
  teacher_name: string;
  enrolled_count: number;
}

export interface TeacherSubjectsOverview {
  summary: {
    subjects_count: number;
    students_count: number;
    academic_period: string | null;
  };
  subjects: TeacherSubject[];
}

export interface TeacherSubjectStudent {
  sis: string;
  ci: string;
  full_name: string;
}

export interface TeacherSubjectDetail {
  subject: TeacherSubject;
  students: TeacherSubjectStudent[];
}
