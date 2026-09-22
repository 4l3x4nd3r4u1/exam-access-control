import type { UserSession } from '../types/auth';

const SESSION_STORAGE_KEY = 'exam_access_control_session';

export function getStoredSession(): UserSession | null {
  const value = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value) as UserSession;
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function storeSession(session: UserSession): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}
