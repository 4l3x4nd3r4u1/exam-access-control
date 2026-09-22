import { useRef, useState } from 'react';
import importRosterIcon from './assets/importar_planilla.svg';
import processedRostersIcon from './assets/planillas_importadas.svg';
import academicStaffIcon from './assets/personal_academico.svg';
import { LoginView } from './views/LoginView';
import { AcademicStaffView } from './views/AcademicStaffView';
import { ProcessedRostersView } from './views/ProcessedRostersView';
import { ProcessedRosterDetailView } from './views/ProcessedRosterDetailView';
import { authService } from './services/authService';
import { apiRequest } from './services/apiClient';
import type { ApiResponse, UserSession } from './types/auth';
import type { ProcessedRoster } from './types/processedRoster';
import './App.css';

interface ImportSummaryData {
  totalProcessed: number;
  successful: number;
  skipped: number;
  observations: string[];
  isSuccessful: boolean;
}

type AdminScreen = 'DASHBOARD' | 'IMPORT_ROSTER' | 'ACADEMIC_STAFF' | 'PROCESSED_ROSTERS' | 'PROCESSED_ROSTER_DETAIL';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(() => authService.getStoredSession());
  const [adminScreen, setAdminScreen] = useState<AdminScreen>('DASHBOARD');
  const [selectedRoster, setSelectedRoster] = useState<ProcessedRoster | null>(null);

  // Import State (Admin)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportSummaryData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = () => {
    authService.clearSession();
    setSession(null);
    setAdminScreen('DASHBOARD');
    setSelectedRoster(null);
    setSelectedFile(null);
    setImportResult(null);
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

      const response = await apiRequest<ApiResponse<ImportSummaryData>>('/students/import', {
        method: 'POST',
        body: formData,
      });

      setImportResult(response.data);
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'No se pudo conectar con el servidor');
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
    return <LoginView onLoginSuccess={setSession} />;
  }

  // teacher view
  if (session.role !== 'ADMIN') {
    return (
      <main className="app-shell panel-container">
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
            <p className="admin-dashboard-subtitle">
              Administrador <span aria-hidden="true">•</span> {session.full_name}
            </p>
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
          <button type="button" className="admin-menu-card" onClick={() => setAdminScreen('IMPORT_ROSTER')}>
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
      </main>
    );
  }

  return (
    <main className="app-shell panel-container">
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
          <button type="button" className="admin-back-button" onClick={() => setAdminScreen('DASHBOARD')}>
            ←
          </button>
          <h1 className="panel-title">Importar planilla</h1>
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
          <img src={importRosterIcon} alt="Padrón" className="import-doc-img" />
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
    </main>
  );
}
