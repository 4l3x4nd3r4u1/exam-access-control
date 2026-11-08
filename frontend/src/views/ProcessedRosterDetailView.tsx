import { useEffect, useRef, useState } from 'react';
import { processedRostersService } from '../services/processedRostersService';
import { BottomDrawer } from '../components/BottomDrawer';
import { downloadRosterCsv, downloadRosterXlsx } from '../utils/rosterExport';
import type { ProcessedRoster, RosterStudent } from '../types/processedRoster';

interface ProcessedRosterDetailViewProps {
  roster: ProcessedRoster;
  onBack: () => void;
  onLogout: () => void;
}

export function ProcessedRosterDetailView({ roster, onBack, onLogout }: ProcessedRosterDetailViewProps) {
  const [metadata, setMetadata] = useState<ProcessedRoster>(roster);
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<RosterStudent | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const courseGroupId = roster.course_group_id || roster.courseGroupId;

  useEffect(() => {
    if (!courseGroupId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    processedRostersService.getProcessedRosterDetail(courseGroupId)
      .then((detail) => {
        if (isMounted) {
          if (detail.metadata) setMetadata(detail.metadata);
          if (Array.isArray(detail.students)) setStudents(detail.students);
        }
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el detalle de la planilla.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [courseGroupId]);

  // Handle click outside & escape key to close export dropdown
  useEffect(() => {
    if (!isExportMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExportMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExportMenuOpen]);

  const activeMetadata = metadata || roster;
  const subjectCode = activeMetadata.subject_code || activeMetadata.subjectCode || '';
  const subjectName = activeMetadata.subject_name || activeMetadata.subjectName || '';
  const teacherName = activeMetadata.teacher_name || activeMetadata.teacherName || '';
  const groupCode = activeMetadata.group_code || activeMetadata.groupCode || '';
  const academicTerm = activeMetadata.academic_term || activeMetadata.academicTerm || '';

  return (
    <main className="app-shell processed-roster-detail-screen">
      <header className="processed-roster-detail-topbar">
        <button type="button" className="processed-rosters-back" onClick={onBack} aria-label="Volver a planillas importadas">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12H4M10 6l-6 6 6 6" />
          </svg>
        </button>
        <button type="button" className="processed-rosters-icon-button" onClick={onLogout} aria-label="Cerrar sesión">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4.25" />
            <path d="M4.5 21c.85-4 3.3-6 7.5-6s6.65 2 7.5 6" />
          </svg>
        </button>
      </header>

      <section className="processed-roster-detail-header">
        <h1>{subjectCode} - {subjectName}</h1>
        <dl>
          <div><dt>Docente:</dt><dd>{teacherName}</dd></div>
          <div><dt>Grupo:</dt><dd>{groupCode}</dd></div>
          <div><dt>Gestión:</dt><dd>{academicTerm}</dd></div>
        </dl>

        <div className="roster-detail-actions">
          <div className="roster-export-dropdown" ref={exportMenuRef}>
            <button
              type="button"
              className="roster-export-btn"
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              disabled={isLoading || students.length === 0}
              aria-haspopup="true"
              aria-expanded={isExportMenuOpen}
              title="Descargar nómina"
            >
              <svg className="roster-export-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <span>Descargar nómina</span>
              <svg className={`roster-chevron ${isExportMenuOpen ? 'is-open' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isExportMenuOpen && (
              <div className="roster-export-menu" role="menu">
                <button
                  type="button"
                  className="roster-export-option"
                  role="menuitem"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    downloadRosterXlsx(activeMetadata, students);
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="roster-option-icon is-xlsx">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13l3 4M11 13l-3 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                  <div className="roster-option-info">
                    <span className="roster-option-title">Descargar en Excel (.xlsx)</span>
                    <span className="roster-option-desc">Hoja de cálculo nativa</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="roster-export-option"
                  role="menuitem"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    downloadRosterCsv(activeMetadata, students);
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="roster-option-icon is-csv">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 12h8M8 16h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                  <div className="roster-option-info">
                    <span className="roster-option-title">Descargar en CSV (.csv)</span>
                    <span className="roster-option-desc">Valores separados por comas</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="roster-detail-table" aria-label="Nómina de estudiantes">
        <div className="roster-detail-table-header">
          <span>sis</span><span>ci</span><span>nombre</span>
        </div>
        {isLoading && <p className="processed-rosters-feedback">Cargando estudiantes...</p>}
        {error && <p className="processed-rosters-feedback processed-rosters-error" role="alert">{error}</p>}
        {!isLoading && !error && students.map((student) => (
          <div
            className="roster-detail-table-row is-clickable"
            key={student.studentKey}
            onClick={() => setSelectedStudent(student)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedStudent(student);
              }
            }}
            title="Clic para ver detalles del estudiante"
          >
            <span>{student.studentKey}</span>
            <span>{student.ci}</span>
            <span>{student.fullName}</span>
          </div>
        ))}
      </section>

      <BottomDrawer
        isOpen={selectedStudent !== null}
        onClose={() => setSelectedStudent(null)}
        ariaLabel="Detalles del estudiante"
      >
        {selectedStudent && (
          <div className="student-detail-drawer">
            <header className="student-detail-header">
              <div className="student-detail-avatar">
                {(selectedStudent.fullName || 'E').charAt(0).toUpperCase()}
              </div>
              <div className="student-detail-title-group">
                <h2>{selectedStudent.fullName}</h2>
                <span className={`student-status-pill ${selectedStudent.status === 'INHABILITADO' ? 'is-inhabilitado' : 'is-habilitado'}`}>
                  {selectedStudent.status || 'HABILITADO'}
                </span>
              </div>
              <button
                type="button"
                className="student-detail-close-btn"
                onClick={() => setSelectedStudent(null)}
                aria-label="Cerrar detalles"
                title="Cerrar"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </button>
            </header>

            <dl className="student-detail-info-list">
              <div className="student-detail-row">
                <dt>Código SIS</dt>
                <dd>{selectedStudent.studentKey}</dd>
              </div>
              <div className="student-detail-row">
                <dt>Cédula de Identidad</dt>
                <dd>{selectedStudent.ci}</dd>
              </div>
              <div className="student-detail-row">
                <dt>Correo Institucional</dt>
                <dd>{selectedStudent.studentKey}@est.umss.edu</dd>
              </div>
              <div className="student-detail-row">
                <dt>Materia</dt>
                <dd>{subjectCode ? `${subjectCode} - ${subjectName}` : subjectName}</dd>
              </div>
              <div className="student-detail-row">
                <dt>Grupo y Gestión</dt>
                <dd>Grupo {groupCode} • {academicTerm}</dd>
              </div>
              {teacherName && (
                <div className="student-detail-row">
                  <dt>Docente Asignado</dt>
                  <dd>{teacherName}</dd>
                </div>
              )}
              {selectedStudent.ineligibilityReason && (
                <div className="student-detail-row is-ineligible">
                  <dt>Motivo de Inhabilitación</dt>
                  <dd>{selectedStudent.ineligibilityReason}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </BottomDrawer>
    </main>
  );
}
