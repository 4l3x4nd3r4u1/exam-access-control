import { useEffect, useRef, useState } from 'react';

import enrolledStudentsIcon from '../assets/estudiantes_inscritos.svg';
import { CourseGroupInfo } from '../components/CourseGroupInfo';
import { BottomDrawer } from '../components/BottomDrawer';
import { downloadRosterCsv, downloadRosterXlsx } from '../utils/rosterExport';
import { courseService } from '../services/courseService';
import type { CourseGroup, EnrolledStudent } from '../types/course';
import type { ProcessedRoster, RosterStudent } from '../types/processedRoster';

interface EnrolledStudentsViewProps {
  courseGroup: CourseGroup;
  onBack: () => void;
  onLogout: () => void;
}

function displayStatus(status: EnrolledStudent['status']): string {
  return status === 'INHABILITADO' ? 'Inhabilitado' : 'Habilitado';
}

export function EnrolledStudentsView({
  courseGroup,
  onBack,
  onLogout,
}: EnrolledStudentsViewProps) {
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<EnrolledStudent | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    courseService
      .getEnrolledStudents(courseGroup.course_group_id)
      .then((items) => {
        if (isMounted) setStudents(items);
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'No se pudo cargar la nómina de estudiantes.',
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [courseGroup.course_group_id]);

  // Click outside & Escape key for dropdown menu
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

  const metadataForExport: ProcessedRoster = {
    course_group_id: courseGroup.course_group_id,
    subject_code: courseGroup.subject_code,
    subject_name: courseGroup.subject_name,
    group_code: courseGroup.group_code,
    academic_term: courseGroup.academic_term,
  };

  const studentsForExport: RosterStudent[] = students.map((s) => ({
    studentKey: s.studentKey,
    ci: s.ci,
    fullName: s.fullName,
    status: s.status,
    ineligibilityReason: s.ineligibilityReason,
  }));

  return (
    <main className="app-shell cg-screen">
      <header className="cg-topbar">
        <button
          type="button"
          className="cg-icon-button"
          onClick={onBack}
          aria-label="Volver al panel"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12H4M10 6l-6 6 6 6" />
          </svg>
        </button>

        <button
          type="button"
          className="cg-icon-button"
          onClick={onLogout}
          aria-label="Cerrar sesión"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4.25" />
            <path d="M4.5 21c.85-4 3.3-6 7.5-6s6.65 2 7.5 6" />
          </svg>
        </button>
      </header>

      <img className="cg-hero-icon" src={enrolledStudentsIcon} alt="" />

      <h1 className="cg-title">
        Estudiantes inscritos
        <br />
        {courseGroup.subject_name}
      </h1>

      <CourseGroupInfo courseGroup={courseGroup} />

      <div className="roster-detail-actions" style={{ marginTop: '16px', justifyContent: 'center' }}>
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
                  downloadRosterXlsx(metadataForExport, studentsForExport);
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
                  downloadRosterCsv(metadataForExport, studentsForExport);
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

      <section className="cg-students" aria-label="Estudiantes inscritos">
        <div className="cg-students-header">
          <span>sis</span>
          <span>nombre</span>
          <span>estado</span>
        </div>

        {isLoading && <p className="cg-feedback">Cargando estudiantes...</p>}

        {error && (
          <p className="cg-feedback cg-error" role="alert">
            {error}
          </p>
        )}

        {!isLoading && !error && students.length === 0 && (
          <p className="cg-feedback">
            No hay estudiantes inscritos en esta materia.
          </p>
        )}

        {!isLoading &&
          !error &&
          students.map((student) => (
            <div
              className="cg-students-row is-clickable"
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
              <span>{student.fullName}</span>
              <span
                className={
                  student.status === 'INHABILITADO' ? 'is-disabled' : undefined
                }
              >
                {displayStatus(student.status)}
              </span>
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
                <dd>{courseGroup.subject_code ? `${courseGroup.subject_code} - ${courseGroup.subject_name}` : courseGroup.subject_name}</dd>
              </div>
              <div className="student-detail-row">
                <dt>Grupo y Gestión</dt>
                <dd>Grupo {courseGroup.group_code} • {courseGroup.academic_term}</dd>
              </div>
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
