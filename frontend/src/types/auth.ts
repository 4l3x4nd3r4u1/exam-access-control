export type UserRole = 'ADMIN' | 'DOCENTE' | 'AUXILIAR';

export interface UserSession {
  user_id: number;
  role: UserRole;
  full_name: string;
  email: string;
  token: string;
  is_active: boolean;
  token_type: string;
  expires_in: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface LoginResponse extends ApiResponse<UserSession> {}
