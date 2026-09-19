export const API_BASE_URL = 'http://127.0.0.1:8000/api';

export function getAuthToken(): string | null {
  const sessionStr = localStorage.getItem('eac_session');
  if (!sessionStr) return null;
  try {
    const session = JSON.parse(sessionStr);
    return session.token || null;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await response.json();

  if (!response.ok) {
    const message = json.message || json.error || 'Error en la petición';
    throw new Error(message);
  }

  return json as T;
}
