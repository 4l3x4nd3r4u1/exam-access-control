import { useState } from 'react';

import assignedCoursesIcon from './assets/icono_materia-2.svg';
import scheduleExamIcon from './assets/programar_examen.svg';
import scheduledExamsIcon from './assets/documento_examen.svg';
import controlPointsIcon from './assets/puntos_control.svg';
import enrolledStudentsIcon from './assets/estudiantes_inscritos.svg';
import studentEligibilityIcon from './assets/estado_habilitacion.svg';
import checkpointIcon from './assets/punto_control.svg';
import importRosterIcon from './assets/importar_planilla.svg';
import processedRostersIcon from './assets/planillas_importadas.svg';
import academicStaffIcon from './assets/personal_academico.svg';
import registerAcademicStaffIcon from './assets/registrar_personal.svg';
import editRolesIcon from './assets/editar_roles.svg';
import editPersonalDataIcon from './assets/editar_datos_personales.svg';

import { ImportRosterDrawer } from './components/ImportRosterDrawer';
import { EditRolesDrawer } from './components/EditRolesDrawer';
import { EditPersonalDataDrawer } from './components/EditPersonalDataDrawer';
import { CourseGroupSearchDrawer } from './components/CourseGroupSearchDrawer';
import { ScheduleExamDrawer } from './components/ScheduleExamDrawer';
import { StudentEligibilityDrawer } from './components/StudentEligibilityDrawer';
import { ExamSearchDrawer } from './components/ExamSearchDrawer';

import { authService, hasFunction } from './services/authService';
import { BlackListView } from './views/BlackListView';

import { FUNCTION_CODES } from './types/auth';
import type { UserSession } from './types/auth';
import type { CourseGroup } from './types/course';
import type { ProcessedRoster } from './types/processedRoster';
import type { ControlExam, ControlExamRoom } from './types/examAccess';

import { AcademicStaffView } from './views/AcademicStaffView';
import {
  AssignedCoursesView,
  type CourseFunctionMode,
} from './views/AssignedCoursesView';
import { EnrolledStudentsView } from './views/EnrolledStudentsView';
import { ExamAccessControlView } from './views/ExamAccessControlView';
import { LoginView } from './views/LoginView';
import { ProcessedRosterDetailView } from './views/ProcessedRosterDetailView';
import { ProcessedRostersView } from './views/ProcessedRostersView';
import { ScheduledExamsView } from './views/ScheduledExamsView';
import { ControlPointsView } from './views/ControlPointsView';
import { ControlPointIngressView } from './views/ControlPointIngressView';
import type { ControlPointSelection } from './types/controlPoint';
import './App.css';
import './AppDashboard.css';
import { AcademicUserDrawer } from './components/NewAcademicUserDrawer';
import blackListIcon from './assets/lista_negra.svg';
import { ExamReportsView } from './views/ExamReportsView';
import examReportsIcon from './assets/icono-reporte-incidente.svg';
import { ExamReportsSearchDrawer } from './components/ExamReportsSearchDrawer';
import type { ControlPointExam } from './types/controlPoint';

type ApplicationScreen =
  | 'DASHBOARD'
  | 'ACADEMIC_STAFF'
  | 'PROCESSED_ROSTERS'
  | 'PROCESSED_ROSTER_DETAIL'
  | 'SCHEDULED_EXAMS'
  | 'ENROLLED_STUDENTS'
  | 'EXAM_ACCESS_CONTROL'
  | 'EXAM_REPORTS'
  | 'CONTROL_POINTS'
  | 'CONTROL_POINT_INGRESS'; 

type DashboardSection =
  | 'ACADEMIC'
  | 'EXAMS'
  | 'CONTROL'
  | 'USERS';

/** Secciones del panel, en el orden del mockup. */
const DASHBOARD_SECTIONS: { id: DashboardSection; title: string }[] = [
  { id: 'ACADEMIC', title: 'Gestión Académica' },
  { id: 'EXAMS', title: 'Gestión de Exámenes' },
  { id: 'CONTROL', title: 'Control y seguimiento' },
  { id: 'USERS', title: 'Administración de Usuarios' },
];

/** Drawer de búsqueda de materia abierto desde el panel. */
type CourseSearchTarget = 'SCHEDULED_EXAMS' | 'ENROLLED_STUDENTS' | 'SCHEDULE_EXAM';

export default function App() {
  const [courseFunctionMode, setCourseFunctionMode] =
    useState<CourseFunctionMode>('VIEW');

  // Acordeón del panel: una sola sección abierta a la vez.
  const [expandedSection, setExpandedSection] =
    useState<DashboardSection | null>('ACADEMIC');

  const [session, setSession] = useState<UserSession | null>(
    () => authService.getStoredSession(),
  );

  const [screen, setScreen] =
    useState<ApplicationScreen>('DASHBOARD');

   const [isExamReportsDrawerOpen, setIsExamReportsDrawerOpen] =
     useState(false);

   const [selectedReportExam, setSelectedReportExam] =
     useState<ControlPointExam | null>(null);

  const [isBlackListOpen, setIsBlackListOpen] = useState(false);

  const [isImportDrawerOpen, setIsImportDrawerOpen] =
    useState(false);

  const [isAssignedCoursesDrawerOpen, setIsAssignedCoursesDrawerOpen] =
    useState(false);

  const [isEditRolesDrawerOpen, setIsEditRolesDrawerOpen] =
    useState(false);

  const [isEditPersonalDataDrawerOpen, setIsEditPersonalDataDrawerOpen] =
    useState(false);

  const [isStudentEligibilityDrawerOpen, setIsStudentEligibilityDrawerOpen] =
    useState(false);

  const [isExamSearchDrawerOpen, setIsExamSearchDrawerOpen] =
    useState(false);

  // Examen y aula (punto de control) elegidos para el control de acceso.
  const [accessControlTarget, setAccessControlTarget] =
    useState<{ exam: ControlExam; room: ControlExamRoom } | null>(null);

  const [selectedRoster, setSelectedRoster] =
    useState<ProcessedRoster | null>(null);

  const [selectedControlPoint, setSelectedControlPoint] = useState<ControlPointSelection | null>(null);

  const [courseSearchTarget, setCourseSearchTarget] =
    useState<CourseSearchTarget | null>(null);
  
  const [isAcademicUserDrawerOpen, setIsAcademicUserDrawerOpen] =
  useState(false);
  
  // Se guarda el grupo elegido (incluye course_group_id) para la vista destino.
  const [selectedCourseGroup, setSelectedCourseGroup] =
    useState<CourseGroup | null>(null);

  const [courseForScheduleExam, setCourseForScheduleExam] =
    useState<CourseGroup | null>(null);

  const handleLogout = () => {
  authService.clearSession();

  setSession(null);
  setScreen('DASHBOARD');
  setIsBlackListOpen(false);

  setSelectedRoster(null);
  setSelectedControlPoint(null);
  setSelectedCourseGroup(null);
  setCourseSearchTarget(null);
  setCourseForScheduleExam(null);
  setAccessControlTarget(null);
  setIsExamSearchDrawerOpen(false);

  setIsImportDrawerOpen(false);
  setIsAssignedCoursesDrawerOpen(false);
  setIsEditRolesDrawerOpen(false);
  setIsEditPersonalDataDrawerOpen(false);
  setIsAcademicUserDrawerOpen(false);

  setCourseFunctionMode('VIEW');
};

  if (!session) {
    return <LoginView onLoginSuccess={setSession} />;
  }


  if (screen === 'ACADEMIC_STAFF') {
  return (
    <AcademicStaffView
      onBack={() => setScreen('DASHBOARD')}
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

  if (screen === 'PROCESSED_ROSTER_DETAIL' && selectedRoster) {
    return (
      <ProcessedRosterDetailView
        roster={selectedRoster}
        onBack={() => setScreen('PROCESSED_ROSTERS')}
        onLogout={handleLogout}
      />
    );
  }
   if (screen === 'EXAM_REPORTS') {
  if (!selectedReportExam) {
  return (
    <main className="app-shell">
      <p>No se ha seleccionado ningún examen.</p>
      <button type="button" onClick={() => setScreen('DASHBOARD')}>
        Volver al panel
      </button>
    </main>
  );
}

  return (
    <ExamReportsView
      exam={selectedReportExam}
      onBack={() => {
        setSelectedReportExam(null);
        setScreen('DASHBOARD');
        setIsExamReportsDrawerOpen(true);
      }}
      onLogout={handleLogout}
    />
  );
}
  if (screen === 'SCHEDULED_EXAMS' && selectedCourseGroup) {
    return (
      <ScheduledExamsView
        courseGroup={selectedCourseGroup}
        onBack={() => setScreen('DASHBOARD')}
        onLogout={handleLogout}
      />
    );
  }

  if (screen === 'ENROLLED_STUDENTS' && selectedCourseGroup) {
    return (
      <EnrolledStudentsView
        courseGroup={selectedCourseGroup}
        onBack={() => setScreen('DASHBOARD')}
        onLogout={handleLogout}
      />
    );
  }
 
  if (screen === 'EXAM_ACCESS_CONTROL' && accessControlTarget) {
    return (
      <ExamAccessControlView
        exam={accessControlTarget.exam}
        room={accessControlTarget.room}
        onBack={() => {
          setAccessControlTarget(null);
          setScreen('DASHBOARD');
        }}
      />
    );
  }

  if (screen === 'CONTROL_POINTS') {
    return (
      <ControlPointsView
        userId={session.user_id}
        onBack={() => setScreen('DASHBOARD')}
        onSelect={(selection) => {
          setSelectedControlPoint(selection);
          setScreen('CONTROL_POINT_INGRESS');
        }}
      />
    );
  }

  if (screen === 'CONTROL_POINT_INGRESS' && selectedControlPoint) {
    return (
      <ControlPointIngressView
        key={`${selectedControlPoint.exam.exam_id}-${selectedControlPoint.room.room_id}-${session.user_id}`}
        selection={selectedControlPoint}
        userId={session.user_id}
        onBack={() => {
          setSelectedControlPoint(null);
          setScreen('CONTROL_POINTS');
        }}
      />
    );
  }

  const menuItems = [
    {
      functionCode: FUNCTION_CODES.VIEW_ASSIGNED_COURSES,
      label: 'Visualizar materias',
      section: 'ACADEMIC' as DashboardSection,
      order: 1,
      icon: assignedCoursesIcon,
      iconClass: 'app-courses-icon',
      open: () => {
        setCourseFunctionMode('VIEW');
        setIsAssignedCoursesDrawerOpen(true);
      },
      visible: hasFunction(
        session,
        FUNCTION_CODES.VIEW_ASSIGNED_COURSES,
      ),
    },
    {
      functionCode: FUNCTION_CODES.SCHEDULE_EXAM,
      label: 'Programar Examen',
      section: 'EXAMS' as DashboardSection,
      order: 1,
      icon: scheduleExamIcon,
      iconClass: 'admin-schedule-exam-icon',
      open: () => setCourseSearchTarget('SCHEDULE_EXAM'),
      visible: hasFunction(
        session,
        FUNCTION_CODES.SCHEDULE_EXAM,
      ),
    },
    {
      functionCode: FUNCTION_CODES.LIST_COURSE_EXAMS,
      label: 'Exámenes programados',
      section: 'EXAMS' as DashboardSection,
      order: 2,
      icon: scheduledExamsIcon,
      iconClass: 'admin-exams-icon',
      open: () => setCourseSearchTarget('SCHEDULED_EXAMS'),
      visible: hasFunction(
        session,
        FUNCTION_CODES.LIST_COURSE_EXAMS,
      ),
    },
    {
      functionCode: FUNCTION_CODES.LIST_COURSE_STUDENTS,
      label: 'Estudiantes inscritos en una materia',
      section: 'CONTROL' as DashboardSection,
      order: 3,
      icon: enrolledStudentsIcon,
      iconClass: 'admin-enrolled-icon',
      open: () => setCourseSearchTarget('ENROLLED_STUDENTS'),
      visible: hasFunction(
        session,
        FUNCTION_CODES.LIST_COURSE_STUDENTS,
      ),
    },
    {
      functionCode: FUNCTION_CODES.MANAGE_STUDENT_ELIGIBILITY,
      label: 'Estado de Habilitación',
      section: 'CONTROL' as DashboardSection,
      order: 1,
      icon: studentEligibilityIcon,
      iconClass: 'admin-eligibility-icon',
      open: () => setIsStudentEligibilityDrawerOpen(true),
      visible: hasFunction(
        session,
        FUNCTION_CODES.MANAGE_STUDENT_ELIGIBILITY,
      ),
    },
    {
      functionCode: FUNCTION_CODES.MANAGE_STUDENT_ELIGIBILITY,
      label: 'Registro de infractores',
      section: 'CONTROL' as DashboardSection,
      order: 4,
      icon: blackListIcon,
      iconClass: 'admin-eligibility-icon',
      open: () => setIsBlackListOpen(true),
      visible: hasFunction(
        session,
        FUNCTION_CODES.MANAGE_STUDENT_ELIGIBILITY,
      ),
    },
        {
      functionCode: FUNCTION_CODES.MANAGE_EXAM_CHECKPOINTS,
      label: 'Reportes de exámenes',
      section: 'EXAMS' as DashboardSection,
      order: 4,
      icon: examReportsIcon,
      iconClass: 'admin-exams-icon',
      open: () => setIsExamReportsDrawerOpen(true),
      visible: hasFunction(
        session,
        FUNCTION_CODES.MANAGE_EXAM_CHECKPOINTS,
      ),
    },
    {
      functionCode: FUNCTION_CODES.MANAGE_EXAM_CHECKPOINTS,
      label: 'Puntos de control',
      section: 'CONTROL' as DashboardSection,
      order: 2,
      icon: checkpointIcon,
      iconClass: 'admin-checkpoint-icon',
      open: () => setIsExamSearchDrawerOpen(true),
      visible: hasFunction(
        session,
        FUNCTION_CODES.MANAGE_EXAM_CHECKPOINTS,
      ),
    },
    {
      functionCode: FUNCTION_CODES.IMPORT_ROSTER,
      label: 'Importar padrón',
      section: 'ACADEMIC' as DashboardSection,
      order: 2,
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
      section: 'EXAMS' as DashboardSection,
      order: 3,
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
      section: 'USERS' as DashboardSection,
      order: 1,
      icon: academicStaffIcon,
      iconClass: 'admin-staff-icon',
      open: () => setScreen('ACADEMIC_STAFF'),
      visible: hasFunction(
        session,
        FUNCTION_CODES.LIST_ACADEMIC_STAFF,
      ),
    },
    {
      functionCode: FUNCTION_CODES.REGISTER_ACADEMIC_STAFF,
      label: 'Registrar personal académico',
      section: 'USERS' as DashboardSection,
      order: 2,
      icon: registerAcademicStaffIcon,
      iconClass: 'admin-register-staff-icon',
      open: () => setIsAcademicUserDrawerOpen(true),
      visible: hasFunction(
        session,
        FUNCTION_CODES.REGISTER_ACADEMIC_STAFF,
      ),
    },
    {
      functionCode: FUNCTION_CODES.EDIT_ROLES,
      label: 'Editar roles',
      section: 'USERS' as DashboardSection,
      order: 3,
      icon: editRolesIcon,
      iconClass: 'admin-roles-icon',
      open: () => setIsEditRolesDrawerOpen(true),
      visible: hasFunction(
        session,
        FUNCTION_CODES.EDIT_ROLES,
      ),
    },
    {
      functionCode: FUNCTION_CODES.EDIT_PERSONAL_DATA,
      label: 'Editar datos Personales',
      section: 'USERS' as DashboardSection,
      order: 4,
      icon: editPersonalDataIcon,
      iconClass: 'admin-personal-data-icon',
      open: () => setIsEditPersonalDataDrawerOpen(true),
      visible: hasFunction(
        session,
        FUNCTION_CODES.EDIT_PERSONAL_DATA,
      ),
    },
    {
      // Navigation entry: GET /exams is available to authenticated users.
      // Room access is determined by the backend's can_interact assignment.
      functionCode: 'control-points',
      label: 'Puntos de control',
      section: 'CONTROL' as DashboardSection,
      order: 5,
      icon: controlPointsIcon,
      iconClass: 'admin-exams-icon',
      open: () => setScreen('CONTROL_POINTS'),
      visible: false,
    },
  ].filter((item) => item.visible);

  return (
    <main className="app-shell admin-dashboard app-dashboard">
      <header className="admin-dashboard-header">
        <div>
          <h1 className="admin-dashboard-title">Panel</h1>
          <p className="admin-dashboard-subtitle">{session.full_name}</p>
        </div>

        <button
          type="button"
          className="admin-icon-button"
          onClick={handleLogout}
          aria-label="Cerrar sesión"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="9.5" r="3" />
            <path d="M6.2 18.6c1-2.6 3.1-3.9 5.8-3.9s4.8 1.3 5.8 3.9" />
          </svg>
        </button>
      </header>

      {menuItems.length > 0 ? (
        <div className="dashboard-sections">
          {DASHBOARD_SECTIONS.map((section) => {
            const items = menuItems
              .filter((item) => item.section === section.id)
              .sort((a, b) => a.order - b.order);

            if (items.length === 0) return null;

            return (
              <section
                className={`dashboard-section ${
                  expandedSection === section.id ? 'is-expanded' : 'is-collapsed'
                }`}
                key={section.id}
                aria-labelledby={`dashboard-section-${section.id}`}
              >
                <h2 className="dashboard-section-title">
                  <button
                    type="button"
                    className="dashboard-section-toggle"
                    id={`dashboard-section-${section.id}`}
                    aria-expanded={expandedSection === section.id}
                    aria-controls={`dashboard-section-content-${section.id}`}
                    onClick={() =>
                      setExpandedSection((current) =>
                        current === section.id ? null : section.id,
                      )
                    }
                  >
                    <span>{section.title}</span>
                    <svg
                      className="dashboard-section-chevron"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </h2>

                <div
                  className={`dashboard-section-content ${
                    expandedSection === section.id ? 'is-open' : ''
                  }`}
                  id={`dashboard-section-content-${section.id}`}
                  aria-hidden={expandedSection !== section.id}
                  inert={expandedSection !== section.id}
                >
                  <div className="dashboard-section-content-inner">
                    <nav
                      className="admin-menu-grid dashboard-section-grid"
                      aria-label={section.title}
                    >
                      {items.map((item) => (
                        <button
                          type="button"
                          className="admin-menu-card"
                          onClick={item.open}
                          key={`${item.functionCode}-${item.label}`}
                        >
                          <div className="admin-menu-card-frame">
                            <img
                              src={item.icon}
                              alt=""
                              className={`admin-menu-icon ${item.iconClass}`}
                            />
                          </div>
                          <span className="admin-menu-card-label">{item.label}</span>
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <p className="app-dashboard-empty">
          Tu cuenta no tiene funciones disponibles.
        </p>
      )}

      <CourseGroupSearchDrawer
        isOpen={courseSearchTarget !== null}
        onClose={() => setCourseSearchTarget(null)}
        currentUserId={session.user_id}
        onlyTeacherCourses={courseSearchTarget === 'SCHEDULE_EXAM'}
        showMyCourses={courseSearchTarget === 'ENROLLED_STUDENTS'}
        ariaLabel={
          courseSearchTarget === 'SCHEDULE_EXAM'
            ? 'Buscar materia para programar examen'
            : courseSearchTarget === 'ENROLLED_STUDENTS'
            ? 'Buscar materia para ver estudiantes inscritos'
            : 'Buscar materia para ver exámenes programados'
        }
        onSelect={(courseGroup) => {
          if (!courseSearchTarget) return;

          if (courseSearchTarget === 'SCHEDULE_EXAM') {
            setCourseForScheduleExam(courseGroup);
            setCourseSearchTarget(null);
            return;
          }

          setSelectedCourseGroup(courseGroup);
          setScreen(courseSearchTarget);
          setCourseSearchTarget(null);
        }}
      />

      {courseForScheduleExam && (
        <ScheduleExamDrawer
          isOpen={Boolean(courseForScheduleExam)}
          course={courseForScheduleExam}
          onClose={() => setCourseForScheduleExam(null)}
        />
      )}

      {isAssignedCoursesDrawerOpen && (
        <AssignedCoursesView
          session={session}
          mode={courseFunctionMode}
          presentation="drawer"
          onBack={() => setIsAssignedCoursesDrawerOpen(false)}
          onLogout={handleLogout}
        />
      )}

      <ImportRosterDrawer
        isOpen={isImportDrawerOpen}
        onClose={() => setIsImportDrawerOpen(false)}
      />

      <EditRolesDrawer
        isOpen={isEditRolesDrawerOpen}
        onClose={() => setIsEditRolesDrawerOpen(false)}
        currentUserId={session.user_id}
      />

      {isEditPersonalDataDrawerOpen && (
        <EditPersonalDataDrawer
          isOpen={isEditPersonalDataDrawerOpen}
          onClose={() => setIsEditPersonalDataDrawerOpen(false)}
          session={session}
          onSuccess={(updated) => {
            setSession((prev) =>
              prev
                ? {
                    ...prev,
                    full_name: updated.fullName,
                    ci: updated.ci !== undefined ? updated.ci : prev.ci,
                  }
                : null,
            );
            setIsEditPersonalDataDrawerOpen(false);
          }}
        />
      )}

      <AcademicUserDrawer
            isOpen={isAcademicUserDrawerOpen}
            onClose={() => setIsAcademicUserDrawerOpen(false)}
            onSaved={() => setIsAcademicUserDrawerOpen(false)}
            />
      
      <ExamSearchDrawer
        isOpen={isExamSearchDrawerOpen}
        onClose={() => setIsExamSearchDrawerOpen(false)}
        onSelect={(exam, room) => {
          setAccessControlTarget({ exam, room });
          setIsExamSearchDrawerOpen(false);
          setScreen('EXAM_ACCESS_CONTROL');
        }}
      />

      <ExamReportsSearchDrawer
       isOpen={isExamReportsDrawerOpen}
       onClose={() => setIsExamReportsDrawerOpen(false)}
       onSelect={(exam) => {
       setSelectedReportExam(exam);
       setIsExamReportsDrawerOpen(false);
       setScreen('EXAM_REPORTS');
      }}
     />

      <StudentEligibilityDrawer
  isOpen={isStudentEligibilityDrawerOpen}
  session={session}
  onClose={() => setIsStudentEligibilityDrawerOpen(false)}
/>

{isBlackListOpen && (
  <BlackListView
    onBack={() => setIsBlackListOpen(false)}
    onLogout={handleLogout}
  />
)}

</main>
  );
}
