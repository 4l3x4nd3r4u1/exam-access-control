import type { JwtPayload, LoginResponse, UserSession } from '../types/auth';
import { apiRequest } from './apiClient';
import {
  clearStoredSession,
  getStoredSession,
  storeSession,
} from './sessionStorage';

function decodeJwtPayload(token: string): JwtPayload {
  const parts = token.split('.');

  if (parts.length !== 3) {
    throw new Error('Token inválido.');
  }

  const payload = parts[1]
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const normalizedPayload = payload.padEnd(
    payload.length + ((4 - (payload.length % 4)) % 4),
    '=',
  );

  try {
    return JSON.parse(atob(normalizedPayload)) as JwtPayload;
  } catch {
    throw new Error('No se pudo leer la información de la sesión.');
  }
}

export const authService = {
  getStoredSession(): UserSession | null {
    return getStoredSession();
  },

  async login(email: string, password: string): Promise<UserSession> {
    const response = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });

    const payload = decodeJwtPayload(response.data.token);
    const userId = Number(payload.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error('El token no contiene un identificador de usuario válido.');
    }

    const session: UserSession = {
      user_id: userId,
      name: payload.name,
      email: payload.email,
      ci: payload.ci,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
      functions: Array.isArray(payload.functions) ? payload.functions : [],
      token: response.data.token,
      is_active: response.data.is_active,
      token_type: response.data.token_type,
      expires_in: response.data.expires_in,
    };

    storeSession(session);

    return session;
  },

  clearSession(): void {
    clearStoredSession();
  },
};