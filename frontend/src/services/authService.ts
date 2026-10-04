import type {
  AuthTokenClaims,
  LoginResponse,
  TokenSession,
  UserSession,
} from '../types/auth';

import { apiRequest } from './apiClient';

import {
  clearStoredSession,
  getStoredSession,
  storeSession,
} from './sessionStorage';

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim() !== '',
      ),
    ),
  ];
}

function decodeTokenClaims(token: string): AuthTokenClaims {
  const payloadSegment = token.split('.')[1];

  if (!payloadSegment) {
    throw new Error(
      'El token recibido no tiene un formato válido.',
    );
  }

  const base64 = payloadSegment
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const paddedBase64 = base64.padEnd(
    Math.ceil(base64.length / 4) * 4,
    '=',
  );

  const bytes = Uint8Array.from(
    atob(paddedBase64),
    (character) => character.charCodeAt(0),
  );

  return JSON.parse(
    new TextDecoder().decode(bytes),
  ) as AuthTokenClaims;
}

function createUserSession(
  tokenSession: TokenSession,
): UserSession {
  const claims = decodeTokenClaims(tokenSession.token);

  const userId = Number(claims.sub);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error(
      'El token no contiene un identificador de usuario válido.',
    );
  }

  if (claims.exp && claims.exp * 1000 <= Date.now()) {
    throw new Error('La sesión ha expirado.');
  }

  return {
    ...tokenSession,
    user_id: userId,
    full_name:
      typeof claims.name === 'string'
        ? claims.name
        : '',
    email:
      typeof claims.email === 'string'
        ? claims.email
        : '',
    ci:
      typeof claims.ci === 'string'
        ? claims.ci
        : null,
    roles: stringList(claims.roles),
    functions: stringList(claims.functions),
  };
}

export function hasFunction(
  session: UserSession,
  functionCode: string,
): boolean {
  return session.functions.includes(functionCode);
}

export function hasRole(
  session: UserSession,
  role: string,
): boolean {
  return session.roles.includes(role);
}

export const authService = {
  getStoredSession(): UserSession | null {
    const storedSession = getStoredSession();

    if (!storedSession) return null;

    try {
      return createUserSession(storedSession);
    } catch {
      clearStoredSession();

      return null;
    }
  },

  async login(
    email: string,
    password: string,
  ): Promise<UserSession> {
    const response = await apiRequest<LoginResponse>(
      '/auth/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      },
    );

    const session = createUserSession(response.data);

    storeSession(response.data);

    return session;
  },

  clearSession(): void {
    clearStoredSession();
  },
};