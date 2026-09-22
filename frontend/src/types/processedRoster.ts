export interface ProcessedRoster {
  courseGroupId: string;
  subjectCode: string;
  subjectName: string;
  groupCode: string;
  academicTerm: string;
  totalStudents: number;
  teacherName: string | null;
}

export interface ProcessedRostersResponse {
  success: boolean;
  data: ProcessedRoster[];
  message: string;
}

export interface RosterStudent {
  studentKey: string;
  ci: string;
  fullName: string;
}

export interface RosterStudentsResponse {
  success: boolean;
  data: RosterStudent[];
  message: string;
}
