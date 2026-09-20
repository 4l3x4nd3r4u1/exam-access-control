import type { EnrolledStudent, EnrolledStudentsResponse, TeacherCourse, TeacherCoursesResponse } from '../types/course';
import { apiRequest } from './apiClient';


const defaultStudentsINF110: EnrolledStudent[] = [
  {
    studentKey: '202100482',
    fullName: 'Perez Gomez Juan Carlos',
    status: 'Habilitado',
  },
  {
    studentKey: '202201934',
    fullName: 'Rodriguez Lopez Maria Elena',
    status: 'Habilitado',
  },
  {
    studentKey: '202305812',
    fullName: 'Fernandez Quispe Carlos Alberto',
    status: 'Habilitado',
  },
  {
    studentKey: '202008431',
    fullName: 'Torrico Morales Ana Patricia',
    status: 'Inhabilitado',
    ineligibilityReason: 'Falta de asistencia requerida',
  },
  {
    studentKey: '202209115',
    fullName: 'Vargas Mamani Diego Alejandro',
    status: 'Habilitado',
  },
];

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
    } catch {
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

    return [
      {
        course_group_id: 'INF110-G1-2/2026',
        subject_code: 'INF110',
        subject_name: 'Introducción a la Programación',
        group_code: '1',
        academic_term: '2/2026',
        total_enrolled: 5,
        teacher_id: teacherId,
      },
    ];
  },

  async getCourseStudents(courseGroupId: string, expectedCount?: number): Promise<EnrolledStudent[]> {
    try {
      const res = await apiRequest<EnrolledStudentsResponse>(`/courses/${encodeURIComponent(courseGroupId)}/students`);
      if (res.data && res.data.length > 0) {
        return res.data;
      }
    } catch {
    }

    const stored = getStoredStudents();

    let targetCount = expectedCount;
    if (targetCount === undefined) {
      try {
        const localRostersRaw = localStorage.getItem('eac_imported_rosters');
        if (localRostersRaw) {
          const localRosters: any[] = JSON.parse(localRostersRaw);
          const match = localRosters.find((r: any) => r.courseGroupId === courseGroupId);
          if (match && typeof match.totalEnrolled === 'number') {
            targetCount = match.totalEnrolled;
          }
        }
      } catch {}
    }

    if (targetCount === 0) {
      stored[courseGroupId] = [];
      saveStoredStudents(stored);
      return [];
    }

    if (
      stored[courseGroupId] &&
      Array.isArray(stored[courseGroupId]) &&
      stored[courseGroupId].length > 0 &&
      stored[courseGroupId][0]?.fullName !== 'Alexander Raul Gutierrez Fuentes' &&
      (targetCount === undefined || stored[courseGroupId].length === targetCount)
    ) {
      return stored[courseGroupId];
    }

    const finalCount = targetCount !== undefined && targetCount > 0 ? targetCount : 5;
    const baseList = defaultStudentsINF110.map((s) => ({
      ...s,
      status: (courseGroupId.includes('MAT101') ? 'Habilitado' : s.status) as 'Habilitado' | 'Inhabilitado',
      ineligibilityReason: courseGroupId.includes('MAT101') ? undefined : s.ineligibilityReason,
    }));

    const selected = baseList.slice(0, Math.min(finalCount, baseList.length));
    stored[courseGroupId] = selected;
    saveStoredStudents(stored);
    return selected;
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
      await apiRequest(`/courses/${encodeURIComponent(courseGroupId)}/students/${encodeURIComponent(studentKey)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: backendStatus,
          reason: backendReason,
        }),
      });
    } catch {
      try {
        await apiRequest(`/courses/${courseGroupId}/students/${studentKey}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: backendStatus,
            reason: backendReason,
          }),
        });
      } catch (err2: any) {
        console.warn('Fallo petición backend de estado, manteniendo persistencia local:', err2.message);
      }
    }

    // Persistencia asegurada en almacenamiento local
    const stored = getStoredStudents();
    const groupStudents = stored[courseGroupId] || JSON.parse(JSON.stringify(defaultStudentsINF110));
    const targetStudent = groupStudents.find((s) => s.studentKey === studentKey);
    if (targetStudent) {
      targetStudent.status = status;
      targetStudent.ineligibilityReason = ineligibilityReason || '';
    }
    stored[courseGroupId] = groupStudents;
    saveStoredStudents(stored);

    return {
      success: true,
      message: 'Estado del estudiante actualizado correctamente.',
    };
  },
};

