import React, { useEffect, useState } from 'react';
import type { UserSession } from '../types/auth';
import type { TeacherCourse } from '../types/course';
import { courseService } from '../services/courseService';
import { Header } from '../components/Header';

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
    <div className="ios-screen-wrapper">
      <main className="teacher-courses-screen">
        {/* Barra superior institucional */}
        <Header session={session} title="Docente" onLogout={onLogout} />

        {/* Header "Materias" según Figma (sin lupa, 3 puntos, ni botón de importar) */}
        <section className="courses-header-section">
          <div className="courses-header-row">
            <h1 className="courses-main-title">Materias</h1>
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
    </div>
  );
};
