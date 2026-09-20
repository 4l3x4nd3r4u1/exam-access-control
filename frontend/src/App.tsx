import { useState, useEffect } from 'react';
import type { UserSession } from './types/auth';
import { authService } from './services/authService';
import { LoginView } from './views/LoginView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { TeacherCoursesView } from './views/TeacherCoursesView';
import { ProcessedRostersPage } from './pages/ProcessedRostersPage';
import { ProcessedRosterDetailPage } from './pages/ProcessedRosterDetailPage';
import './App.css';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

type AuthenticatedView = 'dashboard' | 'processed-rosters' | 'processed-roster-detail';

const readRouteState = (): { view: AuthenticatedView; courseGroupId: string | null } => {
  const path = window.location.pathname;

  if (path === '/planillas') {
    return { view: 'processed-rosters', courseGroupId: null };
  }

  if (path.startsWith('/planillas/')) {
    const encodedId = path.replace('/planillas/', '');
    return {
      view: 'processed-roster-detail',
      courseGroupId: decodeURIComponent(encodedId),
    };
  }

  return { view: 'dashboard', courseGroupId: null };
};

export default function App() {
  const initialRoute = readRouteState();

  const [session, setSession] = useState<UserSession | null>(() => {
    return authService.getStoredSession();
  });

  const [activeView, setActiveView] = useState<AuthenticatedView>(initialRoute.view);
  const [selectedCourseGroupId, setSelectedCourseGroupId] = useState<string | null>(initialRoute.courseGroupId);

  useEffect(() => {
    const handlePopState = () => {
      const routeState = readRouteState();
      setActiveView(routeState.view);
      setSelectedCourseGroupId(routeState.courseGroupId);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
  };

  const handleLogout = () => {
    authService.clearSession();
    setSession(null);
    setActiveView('dashboard');
    setSelectedCourseGroupId(null);
    window.history.pushState(null, '', '/');
  };

  const navigateToDashboard = () => {
    setActiveView('dashboard');
    setSelectedCourseGroupId(null);
    window.history.pushState(null, '', '/');
  };

  const navigateToProcessedRosters = () => {
    setActiveView('processed-rosters');
    setSelectedCourseGroupId(null);
    window.history.pushState(null, '', '/planillas');
  };

  const navigateToRosterDetail = (courseGroupId: string) => {
    setActiveView('processed-roster-detail');
    setSelectedCourseGroupId(courseGroupId);
    window.history.pushState(null, '', `/planillas/${encodeURIComponent(courseGroupId)}`);
  };

  if (!session) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  if (session.role === 'ADMIN') {
    if (activeView === 'processed-rosters') {
      return (
        <ProcessedRostersPage
          apiBaseUrl={API_BASE_URL}
          token={session.token}
          onBack={navigateToDashboard}
          onSelectRoster={navigateToRosterDetail}
        />
      );
    }

    if (activeView === 'processed-roster-detail' && selectedCourseGroupId) {
      return (
        <ProcessedRosterDetailPage
          apiBaseUrl={API_BASE_URL}
          token={session.token}
          courseGroupId={selectedCourseGroupId}
          onBack={navigateToProcessedRosters}
        />
      );
    }

    return (
      <AdminDashboardView
        session={session}
        onLogout={handleLogout}
        onNavigateToProcessedRosters={navigateToProcessedRosters}
      />
    );
  }

  return (
    <TeacherCoursesView
      session={session}
      onLogout={handleLogout}
    />
  );
}
