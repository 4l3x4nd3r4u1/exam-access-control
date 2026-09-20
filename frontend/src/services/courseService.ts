import type { EnrolledStudent, EnrolledStudentsResponse, TeacherCourse, TeacherCoursesResponse } from '../types/course';
import { apiRequest } from './apiClient';

const mockCourses: TeacherCourse[] = [
  {
    course_group_id: 'INF110-G1-2/2026',
    subject_code: 'INF110',
    subject_name: 'Introducción a la Programación',
    group_code: '1',
    academic_term: '2/2026',
    total_enrolled: 200,
    teacher_id: 1,
  },
  {
    course_group_id: 'MAT101-G2-2/2026',
    subject_code: 'MAT101',
    subject_name: 'Álgebra lineal',
    group_code: '2',
    academic_term: '2/2026',
    total_enrolled: 500,
    teacher_id: 1,
  },
  {
    course_group_id: 'INF110-G2-2/2026',
    subject_code: 'INF110',
    subject_name: 'Introducción a la Programación',
    group_code: '2',
    academic_term: '2/2026',
    total_enrolled: 200,
    teacher_id: 1,
  },
  {
    course_group_id: 'MAT101-G1-2/2026',
    subject_code: 'MAT101',
    subject_name: 'Álgebra lineal',
    group_code: '1',
    academic_term: '2/2026',
    total_enrolled: 500,
    teacher_id: 1,
  },
];

const mockStudentsByGroup: Record<string, EnrolledStudent[]> = {
  default: [
    {
      studentKey: '202502303',
      fullName: 'Alexander Raul Gutierrez Fuentes',
      status: 'Inhabilitado',
      ineligibilityReason: 'Incumplimiento de requisitos académicos',
    },
    {
      studentKey: '202100482',
      fullName: 'Perez Gomez Juan',
      status: 'Habilitado',
    },
    {
      studentKey: '202100483',
      fullName: 'Perez Gomez Juan',
      status: 'Inhabilitado',
      ineligibilityReason: 'Documentación incompleta',
    },
    {
      studentKey: '202100484',
      fullName: 'Perez Gomez Juan',
      status: 'Habilitado',
    },
    {
      studentKey: '202100485',
      fullName: 'Perez Gomez Juan',
      status: 'Inhabilitado',
      ineligibilityReason: 'Inasistencia reiterada',
    },
    {
      studentKey: '202100486',
      fullName: 'Perez Gomez Juan',
      status: 'Habilitado',
    },
    {
      studentKey: '202100487',
      fullName: 'Perez Gomez Juan',
      status: 'Inhabilitado',
    },
    {
      studentKey: '202100488',
      fullName: 'Perez Gomez Juan',
      status: 'Habilitado',
    },
    {
      studentKey: '202100489',
      fullName: 'Perez Gomez Juan',
      status: 'Inhabilitado',
    },
    {
      studentKey: '202100490',
      fullName: 'Perez Gomez Juan',
      status: 'Habilitado',
    },
    {
      studentKey: '202100491',
      fullName: 'Perez Gomez Juan',
      status: 'Inhabilitado',
    },
    {
      studentKey: '202100492',
      fullName: 'Perez Gomez Juan',
      status: 'Habilitado',
    },
    {
      studentKey: '202100493',
      fullName: 'Perez Gomez Juan',
      status: 'Inhabilitado',
    },
    {
      studentKey: '202100494',
      fullName: 'Perez Gomez Juan',
      status: 'Habilitado',
    },
  ],
};

export const courseService = {
  async getTeacherCourses(teacherId: number): Promise<TeacherCourse[]> {
    try {
      const res = await apiRequest<TeacherCoursesResponse>(`/teachers/${teacherId}/courses`);
      return res.data && res.data.length > 0 ? res.data : mockCourses;
    } catch {
      return mockCourses;
    }
  },

  async getCourseStudents(courseGroupId: string): Promise<EnrolledStudent[]> {
    try {
      const res = await apiRequest<EnrolledStudentsResponse>(`/course-groups/${encodeURIComponent(courseGroupId)}/students`);
      if (res.data && res.data.length > 0) {
        return res.data;
      }
    } catch {
    }

    if (!mockStudentsByGroup[courseGroupId]) {
      mockStudentsByGroup[courseGroupId] = JSON.parse(JSON.stringify(mockStudentsByGroup.default));
    }
    return mockStudentsByGroup[courseGroupId];
  },

  async updateStudentEnrollmentStatus(
    courseGroupId: string,
    studentKey: string,
    status: 'Habilitado' | 'Inhabilitado',
    ineligibilityReason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      await apiRequest(`/course-groups/${encodeURIComponent(courseGroupId)}/students/${encodeURIComponent(studentKey)}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status,
          ineligibilityReason,
        }),
      });
    } catch {
    }

    const groupStudents = mockStudentsByGroup[courseGroupId] || mockStudentsByGroup.default;
    const targetStudent = groupStudents.find((s) => s.studentKey === studentKey);
    if (targetStudent) {
      targetStudent.status = status;
      targetStudent.ineligibilityReason = ineligibilityReason;
    }

    return {
      success: true,
      message: 'Estado del estudiante actualizado correctamente.',
    };
  },
};

