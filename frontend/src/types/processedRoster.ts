export interface ProcessedRoster {
  course_group_id: string;
  subject_code: string;
  subject_name: string;
  group_code: string;
  academic_term: string;
  teacher_name?: string | null;
  courseGroupId?: string;
  subjectCode?: string;
  subjectName?: string;
  groupCode?: string;
  academicTerm?: string;
  teacherName?: string | null;
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
  status?: string;
  ineligibilityReason?: string | null;
}

export interface ProcessedRosterDetailData {
  metadata: ProcessedRoster;
  students: RosterStudent[];
}

export interface ProcessedRosterDetailResponse {
  success: boolean;
  data: ProcessedRosterDetailData;
  message: string;
}
