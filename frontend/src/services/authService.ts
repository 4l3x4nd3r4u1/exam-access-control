import type { LoginResponse, UserSession } from '../types/auth';
import { apiRequest } from './apiClient';
import { clearStoredSession, getStoredSession, storeSession } from './sessionStorage';

export const authService = {
  getStoredSession(): UserSession | null {
    return getStoredSession();
  },

  async login(email: string, password: string): Promise<UserSession> {
    const response = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    storeSession(response.data);
    return response.data;
  },

  clearSession(): void {
    clearStoredSession();
  },
};
