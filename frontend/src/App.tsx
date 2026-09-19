import React, { useEffect, useRef, useState } from 'react';
import logoSvg from './assets/Group 9.svg';
import importDocSvg from './assets/image 23.svg';
import { TeacherSubjectDetailPage } from './features/teacher-subjects/TeacherSubjectDetailPage';
import { TeacherSubjectsPage } from './features/teacher-subjects/TeacherSubjectsPage';
import './App.css';

interface UserSession {
  user_id: number;
  role: string;
  full_name: string;
  email: string;
  token: string;
  is_active: boolean;
}

interface ImportSummaryData {
  totalProcessed: number;
  successful: number;
  skipped: number;
  observations: string[];
  isSuccessful: boolean;
}

type AuthenticatedView = 'home' | 'teacher-subjects' | 'teacher-subject-detail';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const readRouteState = (): { view: AuthenticatedView; courseGroupId: string | null } => {
  const path = window.location.pathname;

  if (path === '/teacher/subjects') {
    return { view: 'teacher-subjects', courseGroupId: null };
  }

  if (path.startsWith('/teacher/subjects/')) {
    return {
      view: 'teacher-subject-detail',
      courseGroupId: decodeURIComponent(path.replace('/teacher/subjects/', '')),
    };
  }

  return { view: 'home', courseGroupId: null };
};

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

export default function App() {
  const initialRoute = readRouteState();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<UserSession | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [activeView, setActiveView] = useState<AuthenticatedView>(initialRoute.view);
  const [selectedCourseGroupId, setSelectedCourseGroupId] = useState<string | null>(initialRoute.courseGroupId);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportSummaryData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePopState = () => {
      const routeState = readRouteState();
      setActiveView(routeState.view);
      setSelectedCourseGroupId(routeState.courseGroupId);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setAuthLoading(true);
    setAuthError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || 'Credenciales incorrectas');
      }

      setSession(json.data);

      if (json.data.role === 'TEACHER' && activeView === 'home') {
        setActiveView('teacher-subjects');
        window.history.replaceState(null, '', '/teacher/subjects');
      }
    } catch (error: unknown) {
      setAuthError(getErrorMessage(error, 'Error de conexion con el servidor'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setAuthError(null);
    setActiveView('home');
    setSelectedCourseGroupId(null);
    setSelectedFile(null);
    setImportResult(null);
    setImportError(null);
    window.history.pushState(null, '', '/');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const navigateTeacherSubjects = () => {
    setActiveView('teacher-subjects');
    setSelectedCourseGroupId(null);
    window.history.pushState(null, '', '/teacher/subjects');
  };

  const navigateTeacherSubjectDetail = (courseGroupId: string) => {
    setActiveView('teacher-subject-detail');
    setSelectedCourseGroupId(courseGroupId);
    window.history.pushState(null, '', `/teacher/subjects/${encodeURIComponent(courseGroupId)}`);
  };

  const handleTriggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
      setImportError(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadRoster = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setImportError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${API_BASE_URL}/students/import`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          ...(session?.token ? { 'Authorization': `Bearer ${session.token}` } : {}),
        },
        body: formData,
      });

      const json = await response.json();

      if (response.ok && json.data) {
        setImportResult(json.data);
      } else {
        throw new Error(json.message || 'Error al procesar el padron');
      }
    } catch (error: unknown) {
      setImportError(getErrorMessage(error, 'No se pudo conectar con el servidor'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetImport = () => {
    setSelectedFile(null);
    setImportResult(null);
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!session) {
    return (
      <main className="login-container">
        <div className="logo-wrapper">
          <img src={logoSvg} alt="Logo" className="logo-img" />
        </div>

        <h1 className="login-title">
          Sistema de Control de<br />
          Ingreso a Examenes
        </h1>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="input-card">
            <label htmlFor="email-input" className="input-label">
              Correo
            </label>
            <div className="input-field-wrapper">
              <input
                id="email-input"
                type="email"
                className="text-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="docente@umss.edu.bo"
                autoComplete="email"
                required
              />
              {email.length > 0 && (
                <button
                  type="button"
                  className="clear-btn"
                  onClick={() => setEmail('')}
                  title="Limpiar"
                  aria-label="Limpiar correo"
                >
                  x
                </button>
              )}
            </div>
          </div>

          <div className="input-card">
            <label htmlFor="password-input" className="input-label">
              Contrasena
            </label>
            <div className="input-field-wrapper">
              <input
                id="password-input"
                type="password"
                className="text-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password123"
                autoComplete="current-password"
                required
              />
              {password.length > 0 && (
                <button
                  type="button"
                  className="clear-btn"
                  onClick={() => setPassword('')}
                  title="Limpiar"
                  aria-label="Limpiar contrasena"
                >
                  x
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="submit-btn"
            disabled={authLoading || !email || !password}
          >
            {authLoading ? 'Iniciando sesion...' : 'Empezar'}
          </button>

          {authError && (
            <p className="auth-error-text" role="alert">
              {authError}
            </p>
          )}
        </form>
      </main>
    );
  }

  if (session.role !== 'ADMIN') {
    if (activeView === 'teacher-subject-detail' && selectedCourseGroupId) {
      return (
        <TeacherSubjectDetailPage
          apiBaseUrl={API_BASE_URL}
          token={session.token}
          courseGroupId={selectedCourseGroupId}
          onBack={navigateTeacherSubjects}
        />
      );
    }

    return (
      <TeacherSubjectsPage
        apiBaseUrl={API_BASE_URL}
        token={session.token}
        teacherName={session.full_name}
        onLogout={handleLogout}
        onSelectSubject={navigateTeacherSubjectDetail}
      />
    );
  }

  return (
    <main className="panel-container">
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <header className="panel-header">
        <div className="panel-top-row">
          <h1 className="panel-title">Panel</h1>
          <button
            type="button"
            className="header-icon-btn"
            onClick={handleLogout}
            title="Cerrar sesion"
            aria-label="Cerrar sesion"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
        <p className="panel-subtitle">
          Administrador &nbsp;-&nbsp; {session.full_name || 'Administrador del Sistema'}
        </p>
      </header>

      <section className="import-box" aria-label="Subir padron de estudiantes">
        <div className="import-doc-wrapper">
          <img src={importDocSvg} alt="Padron" className="import-doc-img" />
        </div>

        <h2 className="import-title">
          Importar padron<br />de estudiantes
        </h2>

        <p className="import-subtitle">
          Carga la planilla oficial en formato CSV para registrar o actualizar a los estudiantes.
        </p>

        {!importResult && !selectedFile && (
          <button
            type="button"
            className="btn-primary"
            onClick={handleTriggerFilePicker}
          >
            Seleccionar archivo CSV
          </button>
        )}

        {!importResult && selectedFile && (
          <div className="file-upload-action-box">
            <div className="file-badge">
              <span className="file-name" title={selectedFile.name}>
                {selectedFile.name}
              </span>
              {!isUploading && (
                <button
                  type="button"
                  className="file-remove-btn"
                  onClick={handleRemoveFile}
                  title="Quitar"
                  aria-label="Quitar archivo"
                >
                  x
                </button>
              )}
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={handleUploadRoster}
              disabled={isUploading}
            >
              {isUploading ? 'Procesando planilla...' : 'Importar archivo'}
            </button>
          </div>
        )}

        {importError && (
          <p className="auth-error-text" style={{ marginTop: '16px' }} role="alert">
            {importError}
          </p>
        )}

        {importResult && (
          <div className="result-container">
            <div className="result-status-pill">
              {importResult.isSuccessful
                ? 'Planilla importada correctamente'
                : 'Se proceso con observaciones'}
            </div>

            <div className="result-stats-card">
              <div className="stat-line">
                <span className="stat-label">Total registros</span>
                <strong className="stat-value">{importResult.totalProcessed}</strong>
              </div>
              <div className="stat-line">
                <span className="stat-label">Guardados con exito</span>
                <strong className="stat-value">{importResult.successful}</strong>
              </div>
              <div className="stat-line">
                <span className="stat-label">Omitidos</span>
                <strong className="stat-value">{importResult.skipped}</strong>
              </div>
            </div>

            {importResult.observations.length > 0 && (
              <div className="result-obs-box">
                <div className="result-obs-title">
                  Observaciones ({importResult.observations.length})
                </div>
                <ul className="result-obs-list">
                  {importResult.observations.map((obs) => (
                    <li key={obs}>{obs}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              className="btn-secondary"
              onClick={handleResetImport}
            >
              Importar otro archivo
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
