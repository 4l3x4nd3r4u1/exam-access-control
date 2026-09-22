import { useRef, useState } from 'react';
import importDocSvg from './assets/image 23.svg';
import { LoginView } from './views/LoginView';
import { authService } from './services/authService';
import { apiRequest } from './services/apiClient';
import type { ApiResponse, UserSession } from './types/auth';
import './App.css';

interface ImportSummaryData {
  totalProcessed: number;
  successful: number;
  skipped: number;
  observations: string[];
  isSuccessful: boolean;
}

export default function App() {
  const [session, setSession] = useState<UserSession | null>(() => authService.getStoredSession());

  // Import State (Admin)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportSummaryData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = () => {
    authService.clearSession();
    setSession(null);
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
    </main>
  );
}
