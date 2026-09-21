import type { UserSession, LoginResponse } from '../types/auth';
import { apiRequest } from './apiClient';

const STORAGE_KEY = 'eac_session';

export const authService = {
  getStoredSession(): UserSession | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  storeSession(session: UserSession): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  },

  clearSession(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  async login(email: string, password: string): Promise<UserSession> {
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      authService.storeSession(res.data);
      return res.data;
    } catch (err: any) {
      // Si el backend responde con error explícito de credenciales, relanzarlo
      if (err.message && (err.message.includes('Credenciales incorrectas') || err.message.includes('deshabilitado'))) {
        throw err;
      }

      // Simulación de cuentas de prueba (modo offline)
      if (password.length < 4) {
        throw new Error('Credenciales incorrectas. La contraseña es demasiado corta.');
      }

      // Cuenta Administrador de prueba (según Mockup Figma iPhone 17-14)
      if (cleanEmail === 'admin@umss.edu.bo' || cleanEmail.startsWith('admin')) {
        const adminSession: UserSession = {
          user_id: 1,
          role: 'ADMIN',
          full_name: 'Perez Gomez Juan',
          email: cleanEmail,
          token: 'demo-jwt-admin-token',
          is_active: true,
        };
        authService.storeSession(adminSession);
        return adminSession;
      }

      // Cuenta Docente de prueba (según Mockup Figma)
      if (
        cleanEmail === 'docente@fcyt.umss.edu.bo' ||
        cleanEmail === 'docente@umss.edu.bo' ||
        cleanEmail === 'doncente@umss.edu.bo' ||
        cleanEmail.includes('docente') ||
        cleanEmail.endsWith('@fcyt.umss.edu.bo') ||
        cleanEmail.endsWith('@umss.edu.bo')
      ) {
        const teacherSession: UserSession = {
          user_id: 2,
          role: 'TEACHER',
          full_name: 'Perez Gomez Juan',
          email: cleanEmail,
          token: 'demo-jwt-teacher-token',
          is_active: true,
        };
        authService.storeSession(teacherSession);
        return teacherSession;
      }

      // Si no es un correo institucional válido
      throw new Error('Credenciales incorrectas. El usuario no existe en el sistema.');
    }
  },
};
