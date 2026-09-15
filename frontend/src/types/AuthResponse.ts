export interface AuthData {
  user_id: number;
  role_id: number;
  full_name: string;
  email: string;
  token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse {
  message: string;
  data: AuthData;
}