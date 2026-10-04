import { useState, useEffect } from 'react';
import { LoginView } from './views/LoginView';
import { EditRolesModal } from './components/EditRolesModal';
import { ProcessedRostersView } from './views/ProcessedRostersView';
import { ProcessedRosterDetailView } from './views/ProcessedRosterDetailView';
import { TeacherCoursesView } from './views/TeacherCoursesView';
import { authService } from './services/authService';
import { staffService } from './services/staffService';
import { catalogService } from './services/catalogService';
import type { UserSession } from './types/auth';
import type { ProcessedRoster } from './types/processedRoster';
import './App.css';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(() => authService.getStoredSession());
  const [activeAdminScreen, setActiveAdminScreen] = useState<'ROSTERS' | 'EDIT_ROLES'>('ROSTERS');
  const [selectedRoster, setSelectedRoster] = useState<ProcessedRoster | null>(null);

  useEffect(() => {
    if (session) {
      staffService.getAcademicStaff().catch(() => {});
      catalogService.getRoles().catch(() => {});
    }
  }, [session]);

  const handleLogout = () => {
    authService.clearSession();
    setSession(null);
    setSelectedRoster(null);
    setActiveAdminScreen('ROSTERS');
  };

  if (!session) {
    return <LoginView onLoginSuccess={setSession} />;
  }

  const userRoles = Array.isArray(session.roles) && session.roles.length > 0
    ? session.roles.map((roleItem) => String(roleItem).toUpperCase())
    : [String(session.role || '').toUpperCase()];

  const isAdmin = userRoles.includes('ADMIN');
  const isDocente = userRoles.includes('DOCENTE') || userRoles.includes('TEACHER');

  if (!isAdmin && isDocente) {
    return (
      <TeacherCoursesView
        teacherId={session.user_id}
        onLogout={handleLogout}
      />
    );
  }

  if (selectedRoster) {
    return (
      <ProcessedRosterDetailView
        roster={selectedRoster}
        onBack={() => setSelectedRoster(null)}
        onLogout={handleLogout}
      />
    );
  }

  if (activeAdminScreen === 'EDIT_ROLES') {
    return (
      <main className="app-shell">
        <EditRolesModal
          isOpen={true}
          onClose={() => setActiveAdminScreen('ROSTERS')}
          currentUserId={session.user_id}
        />
      </main>
    );
  }

  return (
    <ProcessedRostersView
      onBack={() => setActiveAdminScreen('EDIT_ROLES')}
      onLogout={handleLogout}
      onSelectRoster={(roster) => setSelectedRoster(roster)}
    />
  );
}


