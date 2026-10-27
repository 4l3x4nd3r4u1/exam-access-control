import { useEffect, useMemo, useState } from 'react';
import { BottomDrawer } from './BottomDrawer';
import { StudentStatusForm } from './StudentStatusDrawer';
import { courseService } from '../services/courseService';
import { normalizeText } from '../utils/searchHelper';
import type { CourseGroup, EnrolledStudent } from '../types/course';
import type { UserSession } from '../types/auth';

interface StudentEligibilityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession;
}

const ALL_TERMS = '';

export function StudentEligibilityDrawer({
  isOpen,
  onClose,
  session,
}: StudentEligibilityDrawerProps) {
  // Navigation states
  const [selectedCourseGroup, setSelectedCourseGroup] = useState<CourseGroup | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<EnrolledStudent | null>(null);

  // Step 1: Courses state
  const [courses, setCourses] = useState<CourseGroup[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingMine, setIsLoadingMine] = useState(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [courseSearch, setCourseSearch] = useState('');
  const [term, setTerm] = useState(ALL_TERMS);
  const [onlyMine, setOnlyMine] = useState(false);
  const [myCourseIds, setMyCourseIds] = useState<Set<string> | null>(null);

  // Step 2: Students state
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Check if authenticated user is teacher
  const isTeacher = useMemo(() => {
    return session.roles.some((r) => {
      const norm = r.toUpperCase().trim();
      return norm === 'DOCENTE' || norm === 'TEACHER';
    });
  }, [session.roles]);

  // Load courses when drawer opens
  useEffect(() => {
    if (!isOpen) {
      setSelectedCourseGroup(null);
      setSelectedStudent(null);
      setCourseSearch('');
      setTerm(ALL_TERMS);
      setOnlyMine(false);
      setMyCourseIds(null);
      setStudentSearch('');
      setStatusFilter('');
      return;
    }

    let isMounted = true;
    setIsLoadingCourses(true);
    setCoursesError(null);

    courseService
      .getCourseGroups()
      .then((items) => {
        if (isMounted) setCourses(items);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setCoursesError(
            err instanceof Error ? err.message : 'No se pudo cargar la lista de materias.',
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingCourses(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Load students when a course group is selected
  useEffect(() => {
    if (!selectedCourseGroup) {
      setStudents([]);
      setIsLoadingStudents(false);
      setStudentsError(null);
      return;
    }

    let isMounted = true;
    setIsLoadingStudents(true);
    setStudentsError(null);

    courseService
      .getEnrolledStudents(selectedCourseGroup.course_group_id)
      .then((items) => {
        if (isMounted) setStudents(items);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setStudentsError(
            err instanceof Error ? err.message : 'No se pudo cargar la lista de estudiantes.',
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingStudents(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCourseGroup]);

  // Toggle "Mis materias" filter
  const toggleOnlyMine = () => {
    if (onlyMine) {
      setOnlyMine(false);
      return;
    }

    setOnlyMine(true);

    if (myCourseIds !== null) return;

    setIsLoadingMine(true);
    courseService
      .getTeacherCourses(session.user_id)
      .then((items) => {
        setMyCourseIds(new Set(items.map((item) => item.course_group_id)));
      })
      .catch(() => {
        setMyCourseIds(
          new Set(
            courses
              .filter((c) => c.teacher_id === session.user_id)
              .map((c) => c.course_group_id),
          ),
        );
      })
      .finally(() => setIsLoadingMine(false));
  };

  // Available academic terms
  const availableTerms = useMemo(
    () =>
      [...new Set(courses.map((group) => group.academic_term))]
        .filter(Boolean)
        .sort()
        .reverse(),
    [courses],
  );

  // Filtered courses
  const filteredCourses = useMemo(() => {
    const query = normalizeText(courseSearch);

    return courses.filter((group) => {
      if (term !== ALL_TERMS && group.academic_term !== term) return false;
      if (onlyMine) {
        if (myCourseIds) {
          if (!myCourseIds.has(group.course_group_id)) return false;
        } else if (group.teacher_id !== session.user_id) {
          return false;
        }
      }
      if (!query) return true;

      return normalizeText(
        `${group.subject_name} ${group.subject_code} ${group.group_code} ${group.academic_term}`,
      ).includes(query);
    });
  }, [courses, term, onlyMine, myCourseIds, session.user_id, courseSearch]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    const query = normalizeText(studentSearch);

    return students.filter((student) => {
      if (statusFilter && student.status !== statusFilter) return false;
      if (!query) return true;

      return (
        normalizeText(student.fullName).includes(query) ||
        normalizeText(student.studentKey).includes(query) ||
        normalizeText(student.ci).includes(query)
      );
    });
  }, [students, statusFilter, studentSearch]);

  const handleClose = () => {
    setSelectedStudent(null);
    setSelectedCourseGroup(null);
    onClose();
  };

  const busyCourses = isLoadingCourses || isLoadingMine;

  return (
    <BottomDrawer
      isOpen={isOpen}
      onClose={handleClose}
      ariaLabel={
        selectedStudent
          ? 'Editar estado'
          : selectedCourseGroup
          ? 'Buscar Estudiante'
          : 'Buscar Materia'
      }
    >
      {/* STEP 3: Edit student status (Image 3) */}
      {selectedCourseGroup && selectedStudent ? (
        <StudentStatusForm
          courseGroupId={selectedCourseGroup.course_group_id}
          student={selectedStudent}
          onCancel={() => setSelectedStudent(null)}
          onSaved={(updatedStudent) => {
            setStudents((current) =>
              current.map((s) =>
                s.userId === updatedStudent.userId ? updatedStudent : s,
              ),
            );
            setSelectedStudent(null);
          }}
        />
      ) : selectedCourseGroup ? (
        /* STEP 2: Students list (Image 2) */
        <div className="cg-drawer">
          <label className="cg-search" htmlFor="cg-student-search-input">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m16 16 5 5" />
            </svg>

            <input
              id="cg-student-search-input"
              type="search"
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Buscar Estudiante"
              autoComplete="off"
            />

            {studentSearch && (
              <button type="button" onClick={() => setStudentSearch('')}>
                limpiar
              </button>
            )}
          </label>

          <div className="cg-filters">
            <label className="cg-term-select">
              <span className="cg-visually-hidden">Estado</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filtrar por estado"
              >
                <option value="">Estado</option>
                <option value="HABILITADO">Habilitado</option>
                <option value="INHABILITADO">Inhabilitado</option>
              </select>
            </label>
          </div>

          <div className="cg-count">
            <span>Personas</span>
            <strong>{filteredStudents.length}</strong>
          </div>

          <div className="cg-list" role="list" aria-label="Estudiantes">
            {isLoadingStudents && <p className="cg-feedback">Cargando estudiantes...</p>}

            {studentsError && (
              <p className="cg-feedback cg-error" role="alert">
                {studentsError}
              </p>
            )}

            {!isLoadingStudents &&
              !studentsError &&
              filteredStudents.map((student) => (
                <button
                  type="button"
                  role="listitem"
                  className="cg-row cg-student-row"
                  key={student.studentKey || student.userId}
                  onClick={() => setSelectedStudent(student)}
                >
                  <span className="cg-chip">{student.status}</span>
                  <span className="cg-student-name">{student.fullName}</span>
                </button>
              ))}

            {!isLoadingStudents && !studentsError && filteredStudents.length === 0 && (
              <p className="cg-feedback">No se encontraron estudiantes.</p>
            )}
          </div>

          <button
            type="button"
            className="cg-cancel"
            onClick={() => setSelectedCourseGroup(null)}
          >
            Cancelar
          </button>
        </div>
      ) : (
        /* STEP 1: Course groups search (Image 1) */
        <div className="cg-drawer">
          <label className="cg-search" htmlFor="cg-course-search-input">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m16 16 5 5" />
            </svg>

            <input
              id="cg-course-search-input"
              type="search"
              value={courseSearch}
              onChange={(event) => setCourseSearch(event.target.value)}
              placeholder="Buscar Materia"
              autoComplete="off"
            />

            {courseSearch && (
              <button type="button" onClick={() => setCourseSearch('')}>
                limpiar
              </button>
            )}
          </label>

          <div className="cg-filters">
            <label className="cg-term-select">
              <span className="cg-visually-hidden">Gestión</span>
              <select
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                aria-label="Filtrar por gestión"
              >
                <option value={ALL_TERMS}>Gestión</option>
                {availableTerms.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            {isTeacher && (
              <button
                type="button"
                className={`cg-mine-chip${onlyMine ? ' is-active' : ''}`}
                aria-pressed={onlyMine}
                onClick={toggleOnlyMine}
              >
                Mis materias
              </button>
            )}
          </div>

          <div className="cg-count">
            <span>Materias</span>
            <strong>{filteredCourses.length}</strong>
          </div>

          <div className="cg-list" role="list" aria-label="Materias">
            {busyCourses && <p className="cg-feedback">Cargando materias...</p>}

            {coursesError && (
              <p className="cg-feedback cg-error" role="alert">
                {coursesError}
              </p>
            )}

            {!busyCourses &&
              !coursesError &&
              filteredCourses.map((group) => (
                <button
                  type="button"
                  role="listitem"
                  className={`cg-row${!group.can_interact ? ' is-disabled' : ''}`}
                  key={group.course_group_id}
                  disabled={!group.can_interact}
                  onClick={() => {
                    if (group.can_interact) {
                      setSelectedCourseGroup(group);
                      setStudentSearch('');
                      setStatusFilter('');
                    }
                  }}
                >
                  <span className="cg-row-name">{group.subject_name}</span>
                  {group.academic_term && (
                    <span className="cg-chip">{group.academic_term}</span>
                  )}
                  {group.can_interact && (
                    <span className="cg-chip">INTERACTUAR</span>
                  )}
                  {group.group_code && (
                    <span className="cg-chip">G:{group.group_code}</span>
                  )}
                </button>
              ))}

            {!busyCourses && !coursesError && filteredCourses.length === 0 && (
              <p className="cg-feedback">No se encontraron materias.</p>
            )}
          </div>

          <button type="button" className="cg-cancel" onClick={handleClose}>
            Cancelar
          </button>
        </div>
      )}
    </BottomDrawer>
  );
}
