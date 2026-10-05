import { useEffect, useMemo, useState } from 'react';

import subjectIconOne from '../assets/icono_materia-1.svg';
import subjectIconTwo from '../assets/icono_materia-2.svg';

import { courseService } from '../services/courseService';

import type { TeacherCourse } from '../types/course';

import { TeacherCourseDetailView } from './TeacherCourseDetailView';
import { TeacherStudentsView } from './TeacherStudentsView';
import { TeacherExamsView } from './TeacherExamsView';

interface TeacherCoursesViewProps {
  teacherId: number;
  teacherName: string;
  onBack: () => void;
  onLogout: () => void;
}

const courseIcons = [subjectIconOne, subjectIconTwo];

function courseIcon(subjectCode: string): string {
  const index =
    [...subjectCode].reduce(
      (total, character) => total + character.charCodeAt(0),
      0,
    ) % courseIcons.length;

  return courseIcons[index];
}

function enrollmentColor(total: number): string {
  if (total >= 400) return '#e32929';

  return '#f29e00';
}

export function TeacherCoursesView({
  teacherId,
  teacherName,
  onBack,
  onLogout,
}: TeacherCoursesViewProps) {
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCourse, setSelectedCourse] = useState<{
    course: TeacherCourse;
    icon: string;
  } | null>(null);

  const [isStudentsViewOpen, setIsStudentsViewOpen] =
    useState(false);

  const [isExamsViewOpen, setIsExamsViewOpen] =
    useState(false);

  const [
    isEligibilityStatusViewOpen,
    setIsEligibilityStatusViewOpen,
  ] = useState(false);

  useEffect(() => {
    let isMounted = true;

    courseService
      .getTeacherCourses(teacherId)
      .then((items) => {
        if (isMounted) {
          setCourses(items);
        }
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'No se pudieron cargar las materias.',
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [teacherId]);

  const academicTerms = useMemo(
    () =>
      [...new Set(courses.map((course) => course.academic_term))]
        .sort((first, second) =>
          second.localeCompare(first, 'es', {
            numeric: true,
          }),
        ),
    [courses],
  );

  const visibleCourses = selectedTerm
    ? courses.filter(
        (course) => course.academic_term === selectedTerm,
      )
    : courses;

  const totalStudents = visibleCourses.reduce(
    (total, course) => total + course.total_enrolled,
    0,
  );

  if (selectedCourse) {
    if (isEligibilityStatusViewOpen) {
      return (
        <TeacherStudentsView
          course={selectedCourse.course}
          onBack={() =>
            setIsEligibilityStatusViewOpen(false)
          }
          onLogout={onLogout}
        />
      );
    }

    if (isStudentsViewOpen) {
      return (
        <TeacherStudentsView
          course={selectedCourse.course}
          onBack={() => setIsStudentsViewOpen(false)}
          onLogout={onLogout}
        />
      );
    }

    if (isExamsViewOpen) {
      return (
        <TeacherExamsView
          course={selectedCourse.course}
          onBack={() => setIsExamsViewOpen(false)}
          onLogout={onLogout}
        />
      );
    }

    return (
      <TeacherCourseDetailView
        course={selectedCourse.course}
        subjectIcon={selectedCourse.icon}
        onBack={() => {
          setSelectedCourse(null);
          setIsEligibilityStatusViewOpen(false);
          setIsStudentsViewOpen(false);
          setIsExamsViewOpen(false);
        }}
        onLogout={onLogout}
        onOpenEligibilityStatus={() => {
          setIsStudentsViewOpen(false);
          setIsExamsViewOpen(false);
          setIsEligibilityStatusViewOpen(true);
        }}
        onOpenStudents={() => {
          setIsEligibilityStatusViewOpen(false);
          setIsExamsViewOpen(false);
          setIsStudentsViewOpen(true);
        }}
        onOpenExams={() => {
          setIsEligibilityStatusViewOpen(false);
          setIsStudentsViewOpen(false);
          setIsExamsViewOpen(true);
        }}
      />
    );
  }

  return (
    <main className="app-shell teacher-courses-screen">
      <header className="teacher-courses-heading-row">
        <button
          type="button"
          className="teacher-courses-back"
          onClick={onBack}
          aria-label="Volver"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12H4M10 6l-6 6 6 6" />
          </svg>
        </button>

        <div>
          <h1>Materias</h1>

          <p className="teacher-courses-name">
            {teacherName}
          </p>
        </div>
      </header>

      <div className="teacher-courses-filters">
        <label htmlFor="academic-term">
          Gestión
        </label>

        <select
          id="academic-term"
          value={selectedTerm}
          onChange={(event) =>
            setSelectedTerm(event.target.value)
          }
        >
          <option value="">
            Todas
          </option>

          {academicTerms.map((term) => (
            <option
              value={term}
              key={term}
            >
              {term}
            </option>
          ))}
        </select>
      </div>

      <div className="teacher-courses-summary">
        <span>
          {totalStudents} estudiantes
        </span>

        <span>
          Asignadas <b>{visibleCourses.length}</b>
        </span>
      </div>

      {isLoading && (
        <p className="teacher-courses-feedback">
          Cargando materias...
        </p>
      )}

      {error && (
        <p
          className="teacher-courses-feedback teacher-courses-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {!isLoading &&
        !error &&
        visibleCourses.length === 0 && (
          <p className="teacher-courses-feedback">
            No hay materias asignadas para la gestión
            seleccionada.
          </p>
        )}

      {!isLoading &&
        !error &&
        visibleCourses.length > 0 && (
          <section
            className="teacher-courses-list"
            aria-label="Materias asignadas"
          >
            {visibleCourses.map((course) => {
              const icon = courseIcon(
                course.subject_code,
              );

              return (
                <button
                  type="button"
                  className="teacher-course-card"
                  key={course.course_group_id}
                  onClick={() => {
                    setIsStudentsViewOpen(false);
                    setIsExamsViewOpen(false);
                    setIsEligibilityStatusViewOpen(
                      false,
                    );

                    setSelectedCourse({
                      course,
                      icon,
                    });
                  }}
                >
                  <img
                    src={icon}
                    alt=""
                  />

                  <div className="teacher-course-content">
                    <h2>
                      {course.subject_name}
                    </h2>

                    <div className="teacher-course-meta">
                      <span>
                        Grupo {course.group_code}
                      </span>

                      <span>
                        <i
                          style={{
                            background:
                              enrollmentColor(
                                course.total_enrolled,
                              ),
                          }}
                        />
                        {course.total_enrolled}{' '}
                        inscritos
                      </span>

                      <span className="teacher-course-term">
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <rect
                            x="4"
                            y="5"
                            width="16"
                            height="15"
                            rx="1.5"
                          />
                          <path d="M8 3v4M16 3v4M4 10h16" />
                        </svg>

                        {course.academic_term}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </section>
        )}

      <button
        type="button"
        className="teacher-courses-close"
        onClick={onBack}
      >
        Cerrar
      </button>
    </main>
  );
}