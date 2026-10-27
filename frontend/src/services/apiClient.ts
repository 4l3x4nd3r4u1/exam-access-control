import { getStoredSession } from './sessionStorage';

export const API_BASE_URL = 'http://127.0.0.1:8000/api';

export function createApiHeaders(initialHeaders?: HeadersInit): Headers {
  const headers = new Headers(initialHeaders);
  headers.set('Accept', 'application/json');

  const token = getStoredSession()?.token;
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = createApiHeaders(options.headers);

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await response.json();
  if (!response.ok) {
    let errorMsg = json.message;
    if (json.errors && typeof json.errors === 'object') {
      const firstKey = Object.keys(json.errors)[0];
      if (firstKey && Array.isArray(json.errors[firstKey]) && json.errors[firstKey].length > 0) {
        errorMsg = json.errors[firstKey][0];
      }
    }
    throw new Error(errorMsg || 'No se pudo completar la solicitud.');
  }

  return json as T;
}
