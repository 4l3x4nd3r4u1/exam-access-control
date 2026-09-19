export interface ProcessedRoster {
  courseGroupId: string;
  subjectCode: string;
  subjectName: string;
  groupCode: string;
  academicTerm: string;
  teacherName: string | null;
  totalEnrolled: number;
  updatedAt: string | null;
}

export interface ProcessedRostersResponse {
  total: number;
  rosters: ProcessedRoster[];
}

export interface ProcessedRosterStudent {
  sis: string;
  ci: string;
  fullName: string;
}

export interface ProcessedRosterDetail {
  roster: ProcessedRoster;
  students: ProcessedRosterStudent[];
}
