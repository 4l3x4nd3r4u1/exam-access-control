import React, { useState, useEffect, useRef } from 'react';
import type { UserSession } from '../types/auth';
import type { AcademicStaffMember } from '../types/staff';
import type { ImportSummaryData } from '../types/roster';
import { staffService } from '../services/staffService';
import { rosterService } from '../services/rosterService';
import { getProcessedRosters } from '../services/processedRostersService';
import { NewUserModal } from '../components/NewUserModal';
import { EditUserModal } from '../components/EditUserModal';
import importDocSvg from '../assets/image 23.svg';

interface AdminDashboardViewProps {
  session: UserSession;
  onLogout: () => void;
  onNavigateToProcessedRosters?: () => void;
}

type AdminScreen = 'MAIN_DASHBOARD' | 'STAFF_LIST' | 'IMPORT_ROSTER';

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  session,
  onLogout,
  onNavigateToProcessedRosters,
}) => {
  const [currentScreen, setCurrentScreen] = useState<AdminScreen>('MAIN_DASHBOARD');
  const [staffList, setStaffList] = useState<AcademicStaffMember[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AcademicStaffMember | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [processedCount, setProcessedCount] = useState<number | null>(null);
  const [studentsCount, setStudentsCount] = useState<number | null>(null);

  // Estados para Importar Planilla
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportSummaryData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Abrir selector de archivos nativo
  const handleTriggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  // Archivo seleccionado
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
      setImportError(null);
    }
  };

  // Quitar archivo seleccionado
  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const refreshProcessedMetrics = () => {
    getProcessedRosters('http://127.0.0.1:8000/api', session.token)
      .then((data) => {
        setProcessedCount(data.total);
        const total = data.rosters.reduce((acc, r) => acc + (r.totalEnrolled || 0), 0);
        setStudentsCount(total);
      })
      .catch(() => {});
  };

  // Subir planilla CSV al backend
  const handleUploadRoster = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setImportError(null);

    try {
      const result = await rosterService.importRoster(selectedFile, session.token);
      setImportResult(result);
      refreshProcessedMetrics();
    } catch (err: any) {
      setImportError(err.message || 'No se pudo conectar con el servidor');
    } finally {
      setIsUploading(false);
    }
  };

  // Reiniciar para importar otra planilla
  const handleResetImport = () => {
    setSelectedFile(null);
    setImportResult(null);
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    let isMounted = true;
    staffService.getStaff().then((data) => {
      if (isMounted) {
        setStaffList(data);
      }
    });

    getProcessedRosters('http://127.0.0.1:8000/api', session.token)
      .then((data) => {
        if (isMounted) {
          setProcessedCount(data.total);
          const total = data.rosters.reduce((acc, r) => acc + (r.totalEnrolled || 0), 0);
          setStudentsCount(total);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [session.token]);

  const handleUserCreated = (newUser: AcademicStaffMember) => {
    setSuccessToast(`Usuario ${newUser.full_name} registrado exitosamente.`);
    staffService.getStaff().then(setStaffList).catch(() => {
      setStaffList((prev) => [newUser, ...prev]);
    });
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleUserUpdated = (updatedUser: AcademicStaffMember) => {
    setSuccessToast(`Usuario ${updatedUser.full_name} actualizado exitosamente.`);
    staffService.getStaff().then(setStaffList).catch(() => {
      setStaffList((prev) =>
        prev.map((u) => (u.user_id === updatedUser.user_id ? updatedUser : u))
      );
    });
    setTimeout(() => setSuccessToast(null), 4000);
  };

  return (
    <main className="admin-screen-container">
      {/* Input nativo oculto para archivo */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* ============================================================== */}
      {/* PANTALLA 1: DASHBOARD PRINCIPAL AL LOGUEARSE (FIGMA iPhone 17-14) */}
      {/* ============================================================== */}
      {currentScreen === 'MAIN_DASHBOARD' && (
        <div className="figma-admin-dashboard">
          {/* Frame 95 & 84: Cabecera "Panel" */}
          <div className="figma-header-panel">
            <h1 className="figma-header-title">Panel</h1>
            <div className="figma-header-actions">
              <button
                type="button"
                className="header-icon-btn"
                title="Configuración"
                aria-label="Configuración"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
              <button
                type="button"
                className="header-icon-btn"
                onClick={onLogout}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Frame 79: Administrador · Nombre */}
          <div className="figma-sub-meta-row">
            <span className="figma-meta-role">Administrador</span>
            <span className="figma-meta-dot">·</span>
            <span className="figma-meta-name">{session.full_name || 'Perez Gomez Juan'}</span>
          </div>

          {/* Notificación Toast reactiva */}
          {successToast && (
            <div className="toast-success-banner" role="status">
              <span>✓ {successToast}</span>
            </div>
          )}

          {/* Frame 96: Tarjeta "Resumen" según Figma */}
          <section className="figma-resumen-card" aria-label="Resumen general del sistema">
            <h2 className="resumen-card-title">Resumen</h2>

            {/* Frame 101 / 105: Gestión */}
            <div className="resumen-metric-row">
              <div className="metric-label-group">
                <span className="dot-indicator dot-purple" />
                <span className="metric-name">Gestion</span>
              </div>
              <strong className="metric-val">2 / 2026</strong>
            </div>

            {/* Frame 102 / 106: Estudiantes */}
            <div className="resumen-metric-row row-bordered">
              <div className="metric-label-group">
                <span className="dot-indicator dot-sky" />
                <span className="metric-name">Estudiantes</span>
              </div>
              <strong className="metric-val">{studentsCount !== null ? studentsCount.toLocaleString() : '1,240'}</strong>
            </div>

            {/* Frame 103 / 107: Planillas Procesadas */}
            <div className="resumen-metric-row">
              <div className="metric-label-group">
                <span className="dot-indicator dot-orange" />
                <span className="metric-name">Planillas Procesadas</span>
              </div>
              <strong className="metric-val">{processedCount !== null ? processedCount : 15}</strong>
            </div>

            {/* Frame 104 / 108: Usuarios */}
            <div className="resumen-metric-row row-bordered-top">
              <div className="metric-label-group">
                <span className="dot-indicator dot-magenta" />
                <span className="metric-name">Usuarios</span>
              </div>
              <strong className="metric-val">{staffList.length}</strong>
            </div>
          </section>

          {/* Grilla de Acciones de Figma (Importar planilla, Planillas importadas, Personal Académico) */}
          <section className="admin-two-col-grid">
            {/* Botón: Importar planilla */}
            <div
              className="admin-action-card card-interactive"
              onClick={() => setCurrentScreen('IMPORT_ROSTER')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setCurrentScreen('IMPORT_ROSTER')}
              title="Importar planilla"
            >
              <div className="card-icon-container">
                <img src={importDocSvg} alt="Importar planilla" className="card-doc-img" />
              </div>
              <h3 className="card-action-title">Importar planilla</h3>
            </div>

            {/* Botón: Planillas importadas */}
            <div
              className={`admin-action-card ${onNavigateToProcessedRosters ? 'card-interactive' : 'card-static'}`}
              onClick={onNavigateToProcessedRosters}
              role={onNavigateToProcessedRosters ? 'button' : undefined}
              tabIndex={onNavigateToProcessedRosters ? 0 : undefined}
              onKeyDown={(e) => e.key === 'Enter' && onNavigateToProcessedRosters?.()}
              title="Planillas importadas"
            >
              <div className="card-icon-container">
                <svg width="68" height="74" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <h3 className="card-action-title">Planillas importadas</h3>
            </div>

            {/* Botón: Personal Académico - navega a STAFF_LIST (Figma iPhone 17-15) */}
            <div
              className="admin-action-card card-interactive"
              onClick={() => setCurrentScreen('STAFF_LIST')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setCurrentScreen('STAFF_LIST')}
              title="Entrar a Personal Académico"
            >
              <div className="card-icon-container">
                <div className="figma-folder-graphic" style={{ transform: 'scale(0.68)', margin: '0' }}>
                  <div className="folder-back-tab" />
                  <div className="folder-back-body" />
                  <div className="folder-sheet" />
                  <div className="folder-frosted-front" />
                </div>
              </div>
              <h3 className="card-action-title">Personal Académico</h3>
            </div>
          </section>
        </div>
      )}

      {/* ============================================================== */}
      {/* PANTALLA 2: LISTA DE PERSONAL ACADÉMICO (FIGMA iPhone 17-15)  */}
      {/* ============================================================== */}
      {currentScreen === 'STAFF_LIST' && (
        <div className="figma-staff-list-screen">
          {/* Frame 76: Barra superior con botón regresar ← y botón + para añadir usuario */}
          <div className="screen-sub-header">
            <button
              type="button"
              className="btn-back-figma"
              onClick={() => setCurrentScreen('MAIN_DASHBOARD')}
              aria-label="Regresar al panel principal"
              title="Regresar al panel"
            >
              ←
            </button>
            <button
              type="button"
              className="btn-add-user-figma"
              onClick={() => setIsModalOpen(true)}
              title="Añadir nuevo usuario"
              aria-label="Añadir usuario"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {/* Notificación Toast reactiva */}
          {successToast && (
            <div className="toast-success-banner" role="status">
              <span>✓ {successToast}</span>
            </div>
          )}

          {/* Gráfico Folder de Figma con gradiente azul */}
          <div className="figma-folder-graphic" style={{ width: '140px', height: '104px', margin: '4px auto 12px' }}>
            <div className="folder-back-tab" />
            <div className="folder-back-body" />
            <div className="folder-sheet" />
            <div className="folder-frosted-front" />
          </div>

          {/* Título y contador de usuarios según Figma iPhone 17-15 */}
          <h2 className="figma-staff-title">Personal Académico</h2>
          <p className="figma-staff-subtitle">{staffList.length} usuarios</p>

          {/* Tabla de Personal Académico según diseño Figma iPhone 17-15 */}
          <div className="figma-staff-table-wrapper">
            <div className="figma-table-header">
              <span className="th-rol">rol</span>
              <span className="th-nombre">nombre</span>
              <span className="th-accion" />
            </div>
            <div className="figma-table-divider" />

            <div className="figma-table-body">
              {staffList.map((member, idx) => {
                const isEven = idx % 2 === 1;
                const roleLabel =
                  member.role === 'ADMIN'
                    ? 'Administrador'
                    : member.role === 'ASSISTANT'
                      ? 'Auxiliar'
                      : 'Docente';

                return (
                  <div
                    key={member.user_id}
                    className={`figma-table-row ${isEven ? 'row-alt-bg' : ''}`}
                  >
                    <span className="td-rol">{roleLabel}</span>
                    <span className="td-nombre" title={member.email}>
                      {member.full_name}
                    </span>
                    <button
                      type="button"
                      className="td-editar-btn"
                      onClick={() => setEditingUser(member)}
                    >
                      Editar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PANTALLA 3: IMPORTAR PLANILLA / PADRÓN DE ESTUDIANTES          */}
      {/* ============================================================== */}
      {currentScreen === 'IMPORT_ROSTER' && (
        <div className="figma-import-roster-screen">
          {/* Barra superior con botón regresar ← */}
          <div className="screen-sub-header">
            <button
              type="button"
              className="btn-back-figma"
              onClick={() => {
                handleResetImport();
                setCurrentScreen('MAIN_DASHBOARD');
              }}
              aria-label="Regresar al panel principal"
              title="Regresar al panel"
            >
              ←
            </button>
          </div>

          {/* Tarjeta: Importar Padrón */}
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

                {importResult.observations && importResult.observations.length > 0 && (
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      handleResetImport();
                      if (onNavigateToProcessedRosters) {
                        onNavigateToProcessedRosters();
                      }
                    }}
                  >
                    Ver planillas importadas
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleResetImport}
                  >
                    Importar otro archivo
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Modal de Nuevo Usuario para HU-02 */}
      <NewUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUserCreated={handleUserCreated}
        existingEmails={staffList.map((s) => s.email)}
      />

      {/* Modal de Editar Usuario para HU-03 */}
      <EditUserModal
        isOpen={!!editingUser}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onUserUpdated={handleUserUpdated}
        token={session.token}
      />
    </main>
  );
};
