import { useState } from 'react';

import assignedCoursesIcon from './assets/icono_materia-2.svg';
import importRosterIcon from './assets/importar_planilla.svg';
import processedRostersIcon from './assets/planillas_importadas.svg';
import academicStaffIcon from './assets/personal_academico.svg';

import { ImportRosterDrawer } from './components/ImportRosterDrawer';
import { EditRolesModal } from './components/EditRolesModal';

import { authService, hasFunction } from './services/authService';

import { FUNCTION_CODES } from './types/auth';
import type { UserSession } from './types/auth';
import type { ProcessedRoster } from './types/processedRoster';

import { AcademicStaffView } from './views/AcademicStaffView';
import { AssignedCoursesView } from './views/AssignedCoursesView';
import { LoginView } from './views/LoginView';
import { ProcessedRosterDetailView } from './views/ProcessedRosterDetailView';
import { ProcessedRostersView } from './views/ProcessedRostersView';
import { TeacherCoursesView } from './views/TeacherCoursesView';

import './App.css';

type ApplicationScreen =
  | 'DASHBOARD'
  | 'ACADEMIC_STAFF'
  | 'ASSIGNED_COURSES'
  | 'PROCESSED_ROSTERS'
  | 'PROCESSED_ROSTER_DETAIL'
  | 'TEACHER_COURSES';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(
    () => authService.getStoredSession(),
  );

  const [screen, setScreen] =
    useState<ApplicationScreen>('DASHBOARD');

  const [isImportDrawerOpen, setIsImportDrawerOpen] =
    useState(false);

  const [isEditRolesModalOpen, setIsEditRolesModalOpen] =
    useState(false);

  const [selectedRoster, setSelectedRoster] =
    useState<ProcessedRoster | null>(null);

  const handleLogout = () => {
    authService.clearSession();

    setSession(null);
    setScreen('DASHBOARD');
    setSelectedRoster(null);
    setIsImportDrawerOpen(false);
    setIsEditRolesModalOpen(false);
  };

  if (!session) {
    return <LoginView onLoginSuccess={setSession} />;
  }

  if (screen === 'ASSIGNED_COURSES') {
    return (
      <AssignedCoursesView
        session={session}
        onBack={() => setScreen('DASHBOARD')}
        onLogout={handleLogout}
      />
    );
  }

  if (screen === 'TEACHER_COURSES') {
    return (
      <TeacherCoursesView
        teacherId={session.user_id}
        teacherName={session.full_name}
        onBack={() => setScreen('DASHBOARD')}
        onLogout={handleLogout}
      />
    );
  }

  if (screen === 'ACADEMIC_STAFF') {
    return (
      <AcademicStaffView
        onBack={() => setScreen('DASHBOARD')}
        canRegister={hasFunction(
          session,
          FUNCTION_CODES.REGISTER_ACADEMIC_STAFF,
        )}
        canEditRoles={hasFunction(
          session,
          FUNCTION_CODES.EDIT_ROLES,
        )}
      />
    );
  }

  if (screen === 'PROCESSED_ROSTERS') {
    return (
      <ProcessedRostersView
        onBack={() => setScreen('DASHBOARD')}
        onLogout={handleLogout}
        onSelectRoster={(roster) => {
          setSelectedRoster(roster);
          setScreen('PROCESSED_ROSTER_DETAIL');
        }}
      />
    );
  }

  if (
    screen === 'PROCESSED_ROSTER_DETAIL' &&
    selectedRoster
  ) {
    return (
      <ProcessedRosterDetailView
        roster={selectedRoster}
        onBack={() => setScreen('PROCESSED_ROSTERS')}
        onLogout={handleLogout}
      />
    );
  }

  const canOpenTeacherCourses =
    hasFunction(
      session,
      FUNCTION_CODES.VIEW_ASSIGNED_COURSES,
    ) ||
    hasFunction(
      session,
      FUNCTION_CODES.LIST_COURSE_STUDENTS,
    ) ||
    hasFunction(
      session,
      FUNCTION_CODES.SCHEDULE_EXAM,
    ) ||
    hasFunction(
      session,
      FUNCTION_CODES.LIST_COURSE_EXAMS,
    ) ||
    hasFunction(
      session,
      FUNCTION_CODES.MANAGE_STUDENT_ELIGIBILITY,
    );

  const menuItems = [
    {
      functionCode: FUNCTION_CODES.VIEW_ASSIGNED_COURSES,
      label: 'Visualizar materias',
      icon: assignedCoursesIcon,
      iconClass: 'app-courses-icon',
      open: () => setScreen('ASSIGNED_COURSES'),
      visible: hasFunction(
        session,
        FUNCTION_CODES.VIEW_ASSIGNED_COURSES,
      ),
    },
    {
      functionCode: 'TEACHER_COURSES',
      label: 'Mis materias',
      icon: assignedCoursesIcon,
      iconClass: 'app-courses-icon',
      open: () => setScreen('TEACHER_COURSES'),
      visible: canOpenTeacherCourses,
    },
    {
      functionCode: FUNCTION_CODES.IMPORT_ROSTER,
      label: 'Importar padrón',
      icon: importRosterIcon,
      iconClass: 'admin-import-icon',
      open: () => setIsImportDrawerOpen(true),
      visible: hasFunction(
        session,
        FUNCTION_CODES.IMPORT_ROSTER,
      ),
    },
    {
      functionCode: FUNCTION_CODES.LIST_PROCESSED_ROSTERS,
      label: 'Planillas importadas',
      icon: processedRostersIcon,
      iconClass: 'admin-rosters-icon',
      open: () => setScreen('PROCESSED_ROSTERS'),
      visible: hasFunction(
        session,
        FUNCTION_CODES.LIST_PROCESSED_ROSTERS,
      ),
    },
    {
      functionCode: FUNCTION_CODES.LIST_ACADEMIC_STAFF,
      label: 'Personal académico',
      icon: academicStaffIcon,
      iconClass: 'admin-staff-icon',
      open: () => setScreen('ACADEMIC_STAFF'),
      visible: hasFunction(
        session,
        FUNCTION_CODES.LIST_ACADEMIC_STAFF,
      ),
    },
    {
      functionCode: FUNCTION_CODES.EDIT_ROLES,
      label: 'Editar roles',
      icon: academicStaffIcon,
      iconClass: 'admin-roles-icon',
      open: () => setIsEditRolesModalOpen(true),
      visible: hasFunction(
        session,
        FUNCTION_CODES.EDIT_ROLES,
      ),
    },
  ].filter((item) => item.visible);

  return (
    <main className="app-shell admin-dashboard app-dashboard">
      <header className="admin-dashboard-header">
        <div>
          <h1 className="admin-dashboard-title">
            Panel
          </h1>

          <p className="admin-dashboard-subtitle">
            {session.full_name}
          </p>
        </div>

        <button
          type="button"
          className="admin-icon-button"
          onClick={handleLogout}
          aria-label="Cerrar sesión"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4.25" />
            <path d="M4.5 21c.85-4 3.3-6 7.5-6s6.65 2 7.5 6" />
          </svg>
        </button>
      </header>

      {menuItems.length > 0 ? (
        <nav
          className="admin-menu-grid"
          aria-label="Funciones disponibles"
        >
          {menuItems.map((item) => (
            <button
              type="button"
              className="admin-menu-card"
              onClick={item.open}
              key={item.functionCode}
            >
              <img
                src={item.icon}
                alt=""
                className={`admin-menu-icon ${item.iconClass}`}
              />

              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      ) : (
        <p className="app-dashboard-empty">
          Tu cuenta no tiene funciones disponibles.
        </p>
      )}

      <ImportRosterDrawer
        isOpen={isImportDrawerOpen}
        onClose={() => setIsImportDrawerOpen(false)}
      />

      <EditRolesModal
        isOpen={isEditRolesModalOpen}
        onClose={() => setIsEditRolesModalOpen(false)}
        currentUserId={session.user_id}
      />
    </main>
  );
}