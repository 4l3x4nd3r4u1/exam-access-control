export interface JwtPayload {
  sub: number | string;
  roles: string[];
  functions: string[];
  name: string;
  email: string;
  ci: string;
  iat?: number;
  exp?: number;
}

export interface LoginData {
  token: string;
  is_active: boolean;
  token_type: string;
  expires_in: number;
}

export interface UserSession {
  user_id: number;
  name: string;
  email: string;
  ci: string;
  roles: string[];
  functions: string[];
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

export interface LoginResponse extends ApiResponse<LoginData> {}