import React, { useEffect, useState, useRef } from 'react';
import logoSvg from './assets/Group 9.svg';
import importDocSvg from './assets/image 23.svg';
import { ProcessedRosterDetailPage } from './pages/ProcessedRosterDetailPage';
import { ProcessedRostersPage } from './pages/ProcessedRostersPage';
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

const API_BASE_URL = 'http://127.0.0.1:8000/api';

type AuthenticatedView = 'home' | 'processed-rosters' | 'processed-roster-detail';

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

  return { view: 'home', courseGroupId: null };
};

export default function App() {
  const initialRoute = readRouteState();
  // Authentication State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<UserSession | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [activeView, setActiveView] = useState<AuthenticatedView>(initialRoute.view);
  const [selectedCourseGroupId, setSelectedCourseGroupId] = useState<string | null>(initialRoute.courseGroupId);

  // Import State (Admin)
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

  // Handle Login Submit
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
    } catch (err: any) {
      setAuthError(err.message || 'Error de conexión con el servidor');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Logout
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

  const navigateHome = () => {
    setActiveView('home');
    setSelectedCourseGroupId(null);
    window.history.pushState(null, '', '/');
  };

  const navigateImportedPlans = () => {
    setActiveView('processed-rosters');
    setSelectedCourseGroupId(null);
    window.history.pushState(null, '', '/planillas');
  };

  const navigateImportedPlanDetail = (courseGroupId: string) => {
    setActiveView('processed-roster-detail');
    setSelectedCourseGroupId(courseGroupId);
    window.history.pushState(null, '', `/planillas/${encodeURIComponent(courseGroupId)}`);
  };

  // Open native file dialog
  const handleTriggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  // File chosen
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
      setImportError(null);
    }
  };

  // Remove selected file
  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Upload CSV to Backend
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
        throw new Error(json.message || 'Error al procesar el padrón');
      }
    } catch (err: any) {
      setImportError(err.message || 'No se pudo conectar con el servidor');
    } finally {
      setIsUploading(false);
    }
  };

  // Reset to import another file
  const handleResetImport = () => {
    setSelectedFile(null);
    setImportResult(null);
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!session) {
    return (
      <main className="login-container">
        {/* Logo */}
        <div className="logo-wrapper">
          <img src={logoSvg} alt="Logo" className="logo-img" />
        </div>

        {/* Título */}
        <h1 className="login-title">
          Sistema de Control de<br />
          Ingreso a Exámenes
        </h1>

        {/* Formulario */}
        <form className="login-form" onSubmit={handleLogin}>
          {/* Input Correo */}
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
                placeholder="doncente@umss.edu.bo"
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
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Input Contraseña */}
          <div className="input-card">
            <label htmlFor="password-input" className="input-label">
              Contraseña
            </label>
            <div className="input-field-wrapper">
              <input
                id="password-input"
                type="password"
                className="text-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                autoComplete="current-password"
                required
              />
              {password.length > 0 && (
                <button
                  type="button"
                  className="clear-btn"
                  onClick={() => setPassword('')}
                  title="Limpiar"
                  aria-label="Limpiar contraseña"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Botón Empezar */}
          <button
            type="submit"
            className="submit-btn"
            disabled={authLoading || !email || !password}
          >
            {authLoading ? 'Iniciando sesión...' : 'Empezar'}
          </button>

          {/* Mensaje de Error (Limpio en rojo, sin emojis) */}
          {authError && (
            <p className="auth-error-text" role="alert">
              {authError}
            </p>
          )}
        </form>
      </main>
    );
  }

  // teacher view
  if (session.role !== 'ADMIN') {
    return (
      <main className="panel-container">
        <header className="panel-header">
          <div className="panel-top-row">
            <h1 className="panel-title">Panel</h1>
            <button
              type="button"
              className="header-icon-btn"
              onClick={handleLogout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
          <p className="panel-subtitle">
            Docente &nbsp;•&nbsp; {session.full_name}
          </p>
        </header>

        <div className="import-box" style={{ marginTop: '40px' }}>
          <p style={{ fontSize: '15px', color: '#555', textAlign: 'center', marginBottom: '24px' }}>
            Bienvenido. El módulo docente estará disponible próximamente.
          </p>
          <button type="button" className="submit-btn" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </main>
    );
  }

  if (activeView === 'processed-rosters') {
    return (
      <ProcessedRostersPage
        apiBaseUrl={API_BASE_URL}
        token={session.token}
        onBack={navigateHome}
        onSelectRoster={navigateImportedPlanDetail}
      />
    );
  }

  if (activeView === 'processed-roster-detail' && selectedCourseGroupId) {
    return (
      <ProcessedRosterDetailPage
        apiBaseUrl={API_BASE_URL}
        token={session.token}
        courseGroupId={selectedCourseGroupId}
        onBack={navigateImportedPlans}
      />
    );
  }

  // admin view
  return (
    <main className="panel-container">
      {/* Input nativo oculto para archivo */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Header */}
      <header className="panel-header">
        <div className="panel-top-row">
          <h1 className="panel-title">Panel</h1>
          <button
            type="button"
            className="header-icon-btn"
            onClick={handleLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
        <p className="panel-subtitle">
          Administrador &nbsp;•&nbsp; {session.full_name || 'Administrador del Sistema'}
        </p>
      </header>

      {/* Tarjeta Única: Importar Padrón */}
      <section className="import-box" aria-label="Subir padrón de estudiantes">
        <div className="import-doc-wrapper">
          <img src={importDocSvg} alt="Padrón" className="import-doc-img" />
        </div>

        <h2 className="import-title">
          Importar padrón<br />de estudiantes
        </h2>

        <p className="import-subtitle">
          Carga la planilla oficial en formato CSV para registrar o actualizar a los estudiantes.
        </p>

        {/* ESTADO 1: Sin resultado y sin archivo seleccionado */}
        {!importResult && !selectedFile && (
          <button
            type="button"
            className="btn-primary"
            onClick={handleTriggerFilePicker}
          >
            Seleccionar archivo CSV
          </button>
        )}

        {/* ESTADO 2: Con archivo seleccionado listo para subir */}
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
                  ✕
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

        {/* Error en importación */}
        {importError && (
          <p className="auth-error-text" style={{ marginTop: '16px' }} role="alert">
            {importError}
          </p>
        )}

        {/* ESTADO 3: Resultado de la importación (Estilo Neutro y Limpio) */}
        {importResult && (
          <div className="result-container">
            <div className="result-status-pill">
              {importResult.isSuccessful
                ? 'Planilla importada correctamente'
                : 'Se procesó con observaciones'}
            </div>

            <div className="result-stats-card">
              <div className="stat-line">
                <span className="stat-label">Total registros</span>
                <strong className="stat-value">{importResult.totalProcessed}</strong>
              </div>
              <div className="stat-line">
                <span className="stat-label">Guardados con éxito</span>
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
                  {importResult.observations.map((obs, idx) => (
                    <li key={idx}>{obs}</li>
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

      <button
        type="button"
        className="btn-secondary panel-action-btn"
        onClick={navigateImportedPlans}
      >
        Ver planillas importadas
      </button>
    </main>
  );
}
