import React, { useEffect, useState } from 'react';
import type { UserSession } from '../types/auth';
import type { TeacherCourse } from '../types/course';
import { courseService } from '../services/courseService';

interface TeacherCoursesViewProps {
  session: UserSession;
  onLogout: () => void;
}

export const TeacherCoursesView: React.FC<TeacherCoursesViewProps> = ({
  session,
  onLogout,
}) => {
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    courseService.getTeacherCourses(session.user_id).then((data) => {
      if (isMounted) {
        setCourses(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [session.user_id]);

  // Totales dinámicos
  const totalStudents = courses.reduce((acc, c) => acc + (c.total_enrolled || 0), 0);
  const totalCourses = courses.length;
  const currentTerm = courses[0]?.academic_term || '2/2026';

  return (
    <main className="teacher-courses-screen">
      {/* Header "Materias" según Figma (con iconos de configuración y perfil/logout) */}
      <section className="courses-header-section">
        <div className="courses-header-row">
          <h1 className="courses-main-title">Materias</h1>
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

        {/* Frame 94: Resumen de métricas según Figma */}
        <div className="courses-metrics-row">
          <div className="metric-chip">
            <span className="metric-text">{totalStudents} estudiantes</span>
          </div>

          <div className="metric-chip">
            <span className="metric-text">Asignadas</span>
            <span className="metric-counter-circle">{totalCourses}</span>
          </div>

          <div className="metric-chip">
            <span className="metric-text">{currentTerm}</span>
          </div>
        </div>
      </section>

      {/* Lista de Tarjetas de Materias (Frames 77, 84, 89, 91 de Figma) */}
      {loading ? (
        <div className="courses-loading-state">
          <div className="spinner-dot" />
          <p>Cargando materias asignadas...</p>
        </div>
      ) : (
        <div className="courses-list-container">
          {courses.map((course, index) => {
            const isProgramming = course.subject_name.toLowerCase().includes('program');
            const statusDotColor = (course.total_enrolled || 0) > 300 ? '#D53434' : '#FFA500';

            return (
              <article
                key={`${course.course_group_id}-${index}`}
                className="figma-course-card"
              >
                <div className="course-card-top">
                  {/* Ilustración de materia */}
                  <div className={`course-card-badge-icon ${isProgramming ? 'badge-code' : 'badge-math'}`}>
                    {isProgramming ? (
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                        <line x1="14" y1="4" x2="10" y2="20" stroke="#3b82f6" />
                      </svg>
                    ) : (
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="4" width="16" height="16" rx="2" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                      </svg>
                    )}
                  </div>

                  {/* Título de la materia */}
                  <div className="course-card-title-box">
                    <h2 className="course-subject-title">{course.subject_name}</h2>
                  </div>

                  {/* Botón circular chevron informativo */}
                  <div className="course-chevron-circle" aria-hidden="true">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 1 7 5 3 9" />
                    </svg>
                  </div>
                </div>

                {/* Frame 82 / 85: Metadatos inferiores de la materia */}
                <div className="course-card-footer">
                  <span className="course-group-tag">Grupo {course.group_code}</span>

                  <div className="course-enrolled-tag">
                    <span
                      className="status-dot-indicator"
                      style={{ backgroundColor: statusDotColor }}
                    />
                    <span>{course.total_enrolled} inscritos</span>
                  </div>

                  <div className="course-term-tag">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{course.academic_term}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
};
