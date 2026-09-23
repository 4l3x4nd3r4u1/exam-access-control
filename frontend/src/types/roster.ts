export interface FailedRosterRow {
  rowNumber: number;
  reason: string;
  data: Record<string, string>;
}

export interface RosterMetadata {
  teacherName: string;
  teacherEmail: string;
  subjectCode: string;
  subjectName: string;
  groupCode: string;
  academicTerm: string;
}

export interface ImportRosterSummary {
  totalProcessed: number;
  successful: number;
  skipped: number;
  observations: string[];
  failedRows: FailedRosterRow[];
  metadata: RosterMetadata | null;
  isSuccessful: boolean;
}

export interface ImportRosterApiResponse {
  success: boolean;
  data?: ImportRosterSummary;
  message?: string;
}
