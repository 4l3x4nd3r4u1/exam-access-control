import { apiRequest } from './apiClient';
import type {
  CourseGroup,
  CourseGroupsResponse,
  EnrolledStudent,
  EnrolledStudentsResponse,
  TeacherCourse,
  TeacherCoursesResponse,
} from '../types/course';

export const courseService = {
  async getTeacherCourses(teacherId: number, academicTerm?: string): Promise<TeacherCourse[]> {
    const query = academicTerm ? `?gestion=${encodeURIComponent(academicTerm)}` : '';
    const response = await apiRequest<TeacherCoursesResponse>(`/teachers/${teacherId}/courses${query}`);
    return response.data;
  },

  /** Todos los grupos de materia (buscador). `gestion` es opcional. */
  async getCourseGroups(academicTerm?: string): Promise<CourseGroup[]> {
    const query = academicTerm ? `?gestion=${encodeURIComponent(academicTerm)}` : '';
    const response = await apiRequest<CourseGroupsResponse>(`/course-groups${query}`);
    return response.data;
  },

  async getEnrolledStudents(courseGroupId: string): Promise<EnrolledStudent[]> {
    const response = await apiRequest<EnrolledStudentsResponse>(`/courses/${courseGroupId}/students`);
    return response.data;
  },

  async updateStudentStatus(
    courseGroupId: string,
    userId: number,
    status: EnrolledStudent['status'],
    reason: string,
  ): Promise<void> {
    await apiRequest(`/courses/${courseGroupId}/students/${userId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        reason: status === 'INHABILITADO' ? reason : null,
      }),
    });
  },
};
