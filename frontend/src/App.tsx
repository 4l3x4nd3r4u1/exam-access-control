import { useState, useEffect } from 'react';
import { LoginView } from './views/LoginView';
import { EditRolesModal } from './components/EditRolesModal';
import { authService } from './services/authService';
import { staffService } from './services/staffService';
import { catalogService } from './services/catalogService';
import type { UserSession } from './types/auth';
import './App.css';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(() => authService.getStoredSession());

  useEffect(() => {
    if (session) {
      staffService.getAcademicStaff().catch(() => {});
      catalogService.getRoles().catch(() => {});
    }
  }, [session]);

  const handleLogout = () => {
    authService.clearSession();
    setSession(null);
  };

  if (!session) {
    return <LoginView onLoginSuccess={setSession} />;
  }

  return (
    <main className="app-shell">
      <EditRolesModal
        isOpen={true}
        onClose={handleLogout}
      />
    </main>
  );
}


