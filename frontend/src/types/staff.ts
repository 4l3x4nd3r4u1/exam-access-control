export interface AcademicStaffMember {
  user_id: number;
  full_name: string;
  email: string;
  roles: string[];
  role?: string;
  is_active: boolean;
  _matchMeta?: {
    highlightRanges: Array<[number, number]>;
  };
}

export interface AcademicStaffResponse {
  success: boolean;
  data: AcademicStaffMember[];
  message: string;
}

export interface AcademicUserRegistrationData {
  fullName: string;
  ci: string;
  email: string;
  password: string;
  role: 'DOCENTE' | 'AUXILIAR' | 'ADMIN';
}

export interface AcademicUserUpdateData {
  fullName: string;
  email: string;
  role: 'DOCENTE' | 'AUXILIAR' | 'ADMIN';
  newPassword?: string;
}

export interface UpdateUserRolesPayload {
  userId: number;
  roles: string[];
}

export interface PersonalDataUpdatePayload {
  fullName: string;
  ci?: string;
  newPassword?: string;
}
