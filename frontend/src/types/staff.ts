import type { UserRole } from './auth';

export interface AcademicStaffMember {
  user_id: number;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

export interface NewStaffPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface StaffListResponse {
  success: boolean;
  message: string;
  data: AcademicStaffMember[];
}

export interface StaffCreateResponse {
  success: boolean;
  message: string;
  data: AcademicStaffMember;
}
