export interface AcademicStaffMember {
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface AcademicStaffResponse {
  success: boolean;
  data: AcademicStaffMember[];
  message: string;
}

export interface AcademicUserRegistrationData {
  fullName: string;
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
