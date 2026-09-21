import type { EnrolledStudent, EnrolledStudentsResponse, TeacherCourse, TeacherCoursesResponse } from '../types/course';
import { apiRequest } from './apiClient';

const STUDENTS_STORAGE_KEY = 'eac_students_data';

const getStoredStudents = (): Record<string, EnrolledStudent[]> => {
  try {
    const data = localStorage.getItem(STUDENTS_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

const saveStoredStudents = (data: Record<string, EnrolledStudent[]>) => {
  try {
    localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(data));
  } catch {
  }
};

export const courseService = {
  async getTeacherCourses(teacherId: number): Promise<TeacherCourse[]> {
    try {
      const res = await apiRequest<TeacherCoursesResponse>(`/teachers/${teacherId}/courses`);
      if (res.data && res.data.length > 0) {
        return res.data;
      }
    } catch (err) {
      console.warn('Error al consultar materias del docente en backend:', err);
    }

    try {
      const localRostersRaw = localStorage.getItem('eac_imported_rosters');
      if (localRostersRaw) {
        const localRosters: any[] = JSON.parse(localRostersRaw);
        if (localRosters.length > 0) {
          return localRosters.map((r) => ({
            course_group_id: r.courseGroupId,
            subject_code: r.subjectCode,
            subject_name: r.subjectName,
            group_code: r.groupCode,
            academic_term: r.academicTerm,
            total_enrolled: r.totalEnrolled,
            teacher_id: teacherId,
          }));
        }
      }
    } catch {
    }

    return [];
  },

  async getCourseStudents(courseGroupId: string): Promise<EnrolledStudent[]> {
    try {
      const res = await apiRequest<EnrolledStudentsResponse>(`/courses/${courseGroupId}/students`);
      if (res.data) {
        // Cachear en localStorage para disponibilidad sin conexión
        const stored = getStoredStudents();
        stored[courseGroupId] = res.data;
        saveStoredStudents(stored);
        return res.data;
      }
    } catch {
      try {
        const res = await apiRequest<EnrolledStudentsResponse>(`/courses/${encodeURIComponent(courseGroupId)}/students`);
        if (res.data) {
          const stored = getStoredStudents();
          stored[courseGroupId] = res.data;
          saveStoredStudents(stored);
          return res.data;
        }
      } catch (err) {
        console.warn('Error al obtener nómina de estudiantes del backend:', err);
      }
    }

    const stored = getStoredStudents();
    if (stored[courseGroupId] && Array.isArray(stored[courseGroupId])) {
      return stored[courseGroupId];
    }

    return [];
  },

  async updateStudentEnrollmentStatus(
    courseGroupId: string,
    studentKey: string,
    status: 'Habilitado' | 'Inhabilitado',
    ineligibilityReason?: string
  ): Promise<{ success: boolean; message: string }> {
    const backendStatus = status === 'Habilitado' ? 'HABILITADO' : 'INHABILITADO';
    const backendReason = backendStatus === 'INHABILITADO'
      ? (ineligibilityReason && ineligibilityReason.trim().length > 0 ? ineligibilityReason.trim() : 'Incumplimiento de requisitos académicos')
      : null;

    try {
      await apiRequest(`/courses/${courseGroupId}/students/${studentKey}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: backendStatus,
          reason: backendReason,
        }),
      });
    } catch {
      try {
        await apiRequest(`/courses/${encodeURIComponent(courseGroupId)}/students/${encodeURIComponent(studentKey)}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: backendStatus,
            reason: backendReason,
          }),
        });
      } catch (err2: any) {
        console.warn('Fallo petición backend de estado:', err2.message);
      }
    }

    // Actualizar copia local
    const stored = getStoredStudents();
    const groupStudents = stored[courseGroupId] || [];
    const targetStudent = groupStudents.find((s) => s.studentKey === studentKey);
    if (targetStudent) {
      targetStudent.status = status;
      targetStudent.ineligibilityReason = ineligibilityReason || '';
      stored[courseGroupId] = groupStudents;
      saveStoredStudents(stored);
    }

    return {
      success: true,
      message: 'Estado del estudiante actualizado correctamente.',
    };
  },
};
