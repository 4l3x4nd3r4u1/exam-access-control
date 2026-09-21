import React, { useEffect, useState } from 'react';
import type { UserSession } from '../types/auth';
import type { EnrolledStudent, TeacherCourse } from '../types/course';
import { courseService } from '../services/courseService';
import { EditStudentStatusModal } from '../components/EditStudentStatusModal';
import folderDocSvg from '../assets/image 23.svg';

interface TeacherCoursesViewProps {
  session: UserSession;
  onLogout: () => void;
}

type TeacherScreen = 'COURSES_LIST' | 'COURSE_DETAIL' | 'STUDENTS_LIST';

export const TeacherCoursesView: React.FC<TeacherCoursesViewProps> = ({
  session,
  onLogout,
}) => {
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const [currentScreen, setCurrentScreen] = useState<TeacherScreen>('COURSES_LIST');
  const [selectedCourse, setSelectedCourse] = useState<TeacherCourse | null>(null);

  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<EnrolledStudent | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    courseService.getTeacherCourses(session.user_id).then((data) => {
      if (isMounted) {
        setCourses(data);
        setLoadingCourses(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [session.user_id]);

  const totalStudents = courses.reduce((acc, c) => acc + (c.total_enrolled || 0), 0);
  const totalCourses = courses.length;
  const currentTerm = courses[0]?.academic_term || '2/2026';

  const handleSelectCourse = (course: TeacherCourse) => {
    setSelectedCourse(course);
    setCurrentScreen('COURSE_DETAIL');
  };

  const handleBackToCourses = () => {
    setSelectedCourse(null);
    setCurrentScreen('COURSES_LIST');
  };

  const handleOpenStudentsList = async () => {
    if (!selectedCourse) return;
    setCurrentScreen('STUDENTS_LIST');
    setLoadingStudents(true);
    try {
      const enrolledList = await courseService.getCourseStudents(
        selectedCourse.course_group_id
      );
      setStudents(enrolledList);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleBackToCourseDetail = () => {
    setCurrentScreen('COURSE_DETAIL');
  };

  const handleOpenEditModal = (student: EnrolledStudent) => {
    setSelectedStudent(student);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedStudent(null);
  };

  const handleSaveStudentStatus = async (
    studentKey: string,
    status: 'Habilitado' | 'Inhabilitado',
    ineligibilityReason: string
  ) => {
    if (!selectedCourse) return;

    await courseService.updateStudentEnrollmentStatus(
      selectedCourse.course_group_id,
      studentKey,
      status,
      ineligibilityReason
    );

    setStudents((prevList) =>
      prevList.map((st) =>
        st.studentKey === studentKey
          ? { ...st, status, ineligibilityReason }
          : st
      )
    );
  };

  const renderTopActions = () => (
    <div className="figma-header-actions">
      <button
        type="button"
        className="header-icon-btn"
        title="Modo claro/oscuro"
        aria-label="Modo claro/oscuro"
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
  );

  return (
    <main className="teacher-courses-screen">
      {/* Mockup 1 */}
      {currentScreen === 'COURSES_LIST' && (
        <>
          <section className="courses-header-section">
            <div className="courses-header-row">
              <h1 className="courses-main-title">Materias</h1>
              {renderTopActions()}
            </div>

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

          {loadingCourses ? (
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
                    className="figma-course-card figma-course-card-clickable"
                    onClick={() => handleSelectCourse(course)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectCourse(course);
                      }
                    }}
                    title={`Ver detalle de ${course.subject_name}`}
                  >
                    <div className="course-card-top">
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

                      <div className="course-card-title-box">
                        <h2 className="course-subject-title">{course.subject_name}</h2>
                      </div>

                      <div className="course-chevron-circle" aria-hidden="true">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 1 7 5 3 9" />
                        </svg>
                      </div>
                    </div>

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
        </>
      )}

      {/* Mockup 2 */}
      {currentScreen === 'COURSE_DETAIL' && selectedCourse && (
        <section className="course-detail-view">
          <div className="detail-top-nav-bar">
            <button
              type="button"
              className="detail-back-btn"
              onClick={handleBackToCourses}
              aria-label="Volver a materias"
              title="Volver a materias"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            {renderTopActions()}
          </div>

          <div className="course-detail-hero">
            <div className="course-detail-artwork-wrap">
              <div
                className={`course-card-badge-icon ${
                  selectedCourse.subject_name.toLowerCase().includes('program')
                    ? 'badge-code'
                    : 'badge-math'
                }`}
                style={{ width: 72, height: 72, borderRadius: 18 }}
              >
                {selectedCourse.subject_name.toLowerCase().includes('program') ? (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                    <line x1="14" y1="4" x2="10" y2="20" stroke="#3b82f6" />
                  </svg>
                ) : (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                  </svg>
                )}
              </div>
            </div>

            <h1 className="course-detail-title">{selectedCourse.subject_name}</h1>

            <div className="course-detail-meta-row">
              <span>Grupo {selectedCourse.group_code}</span>
              <span className="meta-separator">•</span>
              <span className="status-dot-indicator" style={{ backgroundColor: '#FFA500' }} />
              <span>{selectedCourse.total_enrolled} inscritos</span>
              <div className="course-term-tag">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{selectedCourse.academic_term}</span>
              </div>
            </div>
          </div>

          <div
            className="course-action-card"
            onClick={handleOpenStudentsList}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenStudentsList();
              }
            }}
            title="Ver estudiantes inscritos"
          >
            <div className="action-card-folder-box">
              <img
                src={folderDocSvg}
                alt="Carpeta de estudiantes"
                className="action-folder-icon"
              />
            </div>
            <div className="action-card-text-box">
              <span className="action-card-title">Estudiantes<br />inscritos</span>
            </div>
            <div className="course-chevron-circle action-card-chevron" aria-hidden="true">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 1 7 5 3 9" />
              </svg>
            </div>
          </div>
        </section>
      )}

      {/* Mockup 3 */}
      {currentScreen === 'STUDENTS_LIST' && (
        <section className="students-roster-view">
          <div className="detail-top-nav-bar">
            <button
              type="button"
              className="detail-back-btn"
              onClick={handleBackToCourseDetail}
              aria-label="Volver al detalle de materia"
              title="Volver al detalle de materia"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            {renderTopActions()}
          </div>

          <div className="students-roster-header">
            <img
              src={folderDocSvg}
              alt="Carpeta estudiantes"
              className="students-roster-folder-img"
            />
            <h1 className="students-roster-title">
              Estudiantes<br />inscritos
            </h1>
          </div>

          {loadingStudents ? (
            <div className="courses-loading-state">
              <div className="spinner-dot" />
              <p>Cargando lista de inscritos...</p>
            </div>
          ) : (
            <div className="roster-table-container">
              <div className="roster-table-header">
                <div className="roster-col-sis" translate="no">SIS</div>
                <div className="roster-col-nombre">nombre</div>
                <div className="roster-col-estado">estado</div>
              </div>

              <div className="roster-table-body">
                {students.map((student, idx) => {
                  const isAltRow = idx % 2 === 1;

                  return (
                    <div
                      key={`${student.studentKey}-${idx}`}
                      className={`roster-table-row ${isAltRow ? 'roster-row-alt' : ''}`}
                      onClick={() => handleOpenEditModal(student)}
                      role="button"
                      tabIndex={0}
                      title={`Clic para editar estado de ${student.fullName}`}
                    >
                      <div className="roster-col-sis">{student.studentKey}</div>
                      <div className="roster-col-nombre">{student.fullName}</div>
                      <div className="roster-col-estado">
                        <span className={`student-status-badge ${student.status === 'Habilitado' ? 'status-habilitado' : 'status-inhabilitado'}`}>
                          {student.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Mockup 4 */}
      <EditStudentStatusModal
        isOpen={isEditModalOpen}
        student={selectedStudent}
        onClose={handleCloseEditModal}
        onSave={handleSaveStudentStatus}
      />
    </main>
  );
};
