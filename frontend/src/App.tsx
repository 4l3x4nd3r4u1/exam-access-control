import { useState } from 'react';
import importRosterIcon from './assets/importar_planilla.svg';
import processedRostersIcon from './assets/planillas_importadas.svg';
import academicStaffIcon from './assets/personal_academico.svg';
import { LoginView } from './views/LoginView';
import { AcademicStaffView } from './views/AcademicStaffView';
import { ProcessedRostersView } from './views/ProcessedRostersView';
import { ProcessedRosterDetailView } from './views/ProcessedRosterDetailView';
import { TeacherCoursesView } from './views/TeacherCoursesView';
import { ImportRosterDrawer } from './components/ImportRosterDrawer';
import { authService } from './services/authService';
import type { UserSession } from './types/auth';
import type { ProcessedRoster } from './types/processedRoster';
import './App.css';

type AdminScreen = 'DASHBOARD' | 'ACADEMIC_STAFF' | 'PROCESSED_ROSTERS' | 'PROCESSED_ROSTER_DETAIL';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(() => authService.getStoredSession());
  const [adminScreen, setAdminScreen] = useState<AdminScreen>('DASHBOARD');
  const [selectedRoster, setSelectedRoster] = useState<ProcessedRoster | null>(null);
  const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false);

  const handleLogout = () => {
    authService.clearSession();
    setSession(null);
    setAdminScreen('DASHBOARD');
    setSelectedRoster(null);
    setIsImportDrawerOpen(false);
  };

  if (!session) {
    return <LoginView onLoginSuccess={setSession} />;
  }

  // teacher view
  if (session.role !== 'ADMIN') {
    return <TeacherCoursesView teacherId={session.user_id} onLogout={handleLogout} />;
  }

  // admin view
  if (adminScreen === 'ACADEMIC_STAFF') {
    return <AcademicStaffView onBack={() => setAdminScreen('DASHBOARD')} />;
  }

  if (adminScreen === 'PROCESSED_ROSTERS') {
    return <ProcessedRostersView onBack={() => setAdminScreen('DASHBOARD')} onLogout={handleLogout} onSelectRoster={(roster) => {
      setSelectedRoster(roster);
      setAdminScreen('PROCESSED_ROSTER_DETAIL');
    }} />;
  }

  if (adminScreen === 'PROCESSED_ROSTER_DETAIL' && selectedRoster) {
    return <ProcessedRosterDetailView roster={selectedRoster} onBack={() => setAdminScreen('PROCESSED_ROSTERS')} onLogout={handleLogout} />;
  }

  if (adminScreen === 'DASHBOARD') {
    return (
      <main className="app-shell admin-dashboard">
        <header className="admin-dashboard-header">
          <div>
            <h1 className="admin-dashboard-title">Panel</h1>
            <p className="admin-dashboard-subtitle">Administrador</p>
          </div>

          <div className="admin-header-actions">
            <button type="button" className="admin-icon-button" aria-label="Cambiar apariencia">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="3.25" />
                <path d="M12 2v2.25M12 19.75V22M4.93 4.93l1.59 1.59M17.48 17.48l1.59 1.59M2 12h2.25M19.75 12H22M4.93 19.07l1.59-1.59M17.48 6.52l1.59-1.59" />
              </svg>
            </button>
            <button type="button" className="admin-icon-button" onClick={handleLogout} aria-label="Cerrar sesión">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="4.25" />
                <path d="M4.5 21c.85-4 3.3-6 7.5-6s6.65 2 7.5 6" />
              </svg>
            </button>
          </div>
        </header>

        <nav className="admin-menu-grid" aria-label="Opciones administrativas">
          <button type="button" className="admin-menu-card" onClick={() => setIsImportDrawerOpen(true)}>
            <img src={importRosterIcon} alt="" className="admin-menu-icon admin-import-icon" />
            <span>Importar<br />planilla</span>
          </button>

          <button type="button" className="admin-menu-card" onClick={() => setAdminScreen('PROCESSED_ROSTERS')}>
            <img src={processedRostersIcon} alt="" className="admin-menu-icon admin-rosters-icon" />
            <span>Planillas<br />importadas</span>
          </button>

          <button type="button" className="admin-menu-card" onClick={() => setAdminScreen('ACADEMIC_STAFF')}>
            <img src={academicStaffIcon} alt="" className="admin-menu-icon admin-staff-icon" />
            <span>Personal<br />Académico</span>
          </button>
        </nav>
        <ImportRosterDrawer isOpen={isImportDrawerOpen} onClose={() => setIsImportDrawerOpen(false)} />
      </main>
    );
  }

  return null;
}
