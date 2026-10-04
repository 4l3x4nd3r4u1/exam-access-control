import type { UserSession } from '../types/auth';
import { decodeJwtToken } from './jwtHelper';

const SESSION_STORAGE_KEY = 'exam_access_control_session';

function enrichSessionFromToken(session: UserSession): UserSession {
  if (!session.token) return session;

  const payload = decodeJwtToken(session.token);
  if (!payload) return session;

  const tokenRoles = Array.isArray(payload.roles)
    ? payload.roles.map((item) => String(item).toUpperCase())
    : [];

  const roles = session.roles && session.roles.length > 0 ? session.roles : tokenRoles;
  const role = session.role || roles[0] || '';
  const userId = session.user_id || Number(payload.sub ?? 0);
  const fullName = session.full_name || String(payload.name ?? '');
  const email = session.email || String(payload.email ?? '');

  return {
    ...session,
    role,
    roles,
    user_id: userId,
    full_name: fullName,
    email,
  };
}

export function getStoredSession(): UserSession | null {
  const value = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!value) return null;

  try {
    const rawSession = JSON.parse(value) as UserSession;
    return enrichSessionFromToken(rawSession);
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function storeSession(session: UserSession): void {
  const enriched = enrichSessionFromToken(session);
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(enriched));
}

export function clearStoredSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}
