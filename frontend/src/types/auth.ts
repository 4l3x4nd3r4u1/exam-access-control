export type UserRole = 'ADMIN' | 'TEACHER' | 'ASSISTANT';

export interface UserSession {
  user_id: number;
  role: UserRole;
  full_name: string;
  email: string;
  token: string;
  is_active: boolean;
  expiresIn?: number;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: UserSession;
}
