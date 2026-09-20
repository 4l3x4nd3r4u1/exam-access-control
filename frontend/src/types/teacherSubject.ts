export interface TeacherSubject {
  courseGroupId: string;
  subjectCode: string;
  subjectName: string;
  groupCode: string;
  academicTerm: string;
  enrolledCount: number;
  teacherId: number;
}

export interface TeacherSubjectsOverview {
  summary: {
    subjectsCount: number;
    studentsCount: number;
    academicPeriod: string | null;
  };
  subjects: TeacherSubject[];
}
