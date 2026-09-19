import type {
  ProcessedRoster,
  ProcessedRosterDetail,
  ProcessedRostersResponse,
  ProcessedRosterStudent,
} from '../types/processedRoster';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface RawProcessedRoster {
  course_group_id?: string;
  courseGroupId?: string;
  subject_code?: string;
  subjectCode?: string;
  subject_name?: string;
  subjectName?: string;
  group_code?: string;
  groupCode?: string;
  academic_term?: string;
  academicTerm?: string;
  teacher_name?: string | null;
  teacherName?: string | null;
  total_enrolled?: number;
  totalEnrolled?: number;
  enrolled_count?: number;
  enrolledCount?: number;
  updated_at?: string | null;
  updatedAt?: string | null;
}

interface RawProcessedRosterStudent {
  sis?: string;
  student_key?: string;
  studentKey?: string;
  ci?: string;
  full_name?: string;
  fullName?: string;
}

const authHeaders = (token: string) => ({
  Accept: 'application/json',
  Authorization: `Bearer ${token}`,
});

const readApiResponse = async <T>(response: Response): Promise<T> => {
  const json = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !json.success || json.data === undefined) {
    throw new Error(json.message || json.error || 'No se pudo completar la solicitud.');
  }

  return json.data;
};

const toProcessedRoster = (raw: RawProcessedRoster): ProcessedRoster => ({
  courseGroupId: raw.courseGroupId ?? raw.course_group_id ?? '',
  subjectCode: raw.subjectCode ?? raw.subject_code ?? '',
  subjectName: raw.subjectName ?? raw.subject_name ?? '',
  groupCode: raw.groupCode ?? raw.group_code ?? '',
  academicTerm: raw.academicTerm ?? raw.academic_term ?? '',
  teacherName: raw.teacherName ?? raw.teacher_name ?? null,
  totalEnrolled: raw.totalEnrolled ?? raw.total_enrolled ?? raw.enrolledCount ?? raw.enrolled_count ?? 0,
  updatedAt: raw.updatedAt ?? raw.updated_at ?? null,
});

const toProcessedRosterStudent = (raw: RawProcessedRosterStudent): ProcessedRosterStudent => ({
  sis: raw.sis ?? raw.studentKey ?? raw.student_key ?? '',
  ci: raw.ci ?? '',
  fullName: raw.fullName ?? raw.full_name ?? '',
});

export const getProcessedRosters = async (
  apiBaseUrl: string,
  token: string,
  signal?: AbortSignal,
): Promise<ProcessedRostersResponse> => {
  const response = await fetch(`${apiBaseUrl}/processed-rosters`, {
    headers: authHeaders(token),
    signal,
  });

  const data = await readApiResponse<RawProcessedRoster[] | {
    total?: number;
    rosters?: RawProcessedRoster[];
    plans?: RawProcessedRoster[];
    items?: RawProcessedRoster[];
  }>(response);

  if (Array.isArray(data)) {
    return {
      total: data.length,
      rosters: data.map(toProcessedRoster),
    };
  }

  const rawRosters = data.rosters ?? data.plans ?? data.items ?? [];

  return {
    total: data.total ?? rawRosters.length,
    rosters: rawRosters.map(toProcessedRoster),
  };
};

export const getProcessedRosterDetail = async (
  apiBaseUrl: string,
  token: string,
  courseGroupId: string,
  signal?: AbortSignal,
): Promise<ProcessedRosterDetail> => {
  const response = await fetch(`${apiBaseUrl}/processed-rosters/${encodeURIComponent(courseGroupId)}`, {
    headers: authHeaders(token),
    signal,
  });

  const data = await readApiResponse<{
    roster?: RawProcessedRoster;
    plan?: RawProcessedRoster;
    students?: RawProcessedRosterStudent[];
  }>(response);

  return {
    roster: toProcessedRoster(data.roster ?? data.plan ?? {}),
    students: (data.students ?? []).map(toProcessedRosterStudent),
  };
};
