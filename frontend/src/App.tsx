import { useState } from 'react';
import type { UserSession } from './types/auth';
import { authService } from './services/authService';
import { LoginView } from './views/LoginView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { TeacherCoursesView } from './views/TeacherCoursesView';
import './App.css';

export default function App() {
  // 1. Obtener la sesión guardada en localStorage (o null para iniciar en login)
  const [session, setSession] = useState<UserSession | null>(() => {
    return authService.getStoredSession();
  });

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
  };

  const handleLogout = () => {
    authService.clearSession();
    setSession(null);
  };

  // Guardia de autenticación (HU-01): Si no hay sesión activa, muestra pantalla de Login
  if (!session) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Guardia y enrutador condicional por rol (HU-01):
  // Redirige a ADMIN al panel de administración y a DOCENTE a la vista de Materias
  if (session.role === 'ADMIN') {
    return (
      <AdminDashboardView
        session={session}
        onLogout={handleLogout}
      />
    );
  }

  // Rol DOCENTE (TEACHER)
  return (
    <TeacherCoursesView
      session={session}
      onLogout={handleLogout}
    />
  );
}
