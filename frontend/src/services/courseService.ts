import type { TeacherCourse, TeacherCoursesResponse } from '../types/course';
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

export const courseService = {
  async getTeacherCourses(teacherId: number): Promise<TeacherCourse[]> {
    try {
      const res = await apiRequest<TeacherCoursesResponse>(`/teachers/${teacherId}/courses`);
      return res.data && res.data.length > 0 ? res.data : mockCourses;
    } catch {
      return mockCourses;
    }
  },
};
