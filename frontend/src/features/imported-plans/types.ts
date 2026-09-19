export interface ImportedPlan {
  course_group_id: string;
  subject_code: string;
  subject_name: string;
  group_code: string;
  academic_term: string;
  teacher_name: string | null;
  total_enrolled: number;
  updated_at: string;
}

export interface ImportedPlansResponse {
  total: number;
  plans: ImportedPlan[];
}

export interface ImportedPlanStudent {
  sis: string;
  ci: string;
  full_name: string;
}

export interface ImportedPlanDetail {
  plan: ImportedPlan;
  students: ImportedPlanStudent[];
}
