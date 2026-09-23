import { apiRequest } from './apiClient';
import type { EnrolledStudent, EnrolledStudentsResponse, TeacherCourse, TeacherCoursesResponse } from '../types/course';

export const courseService = {
  async getTeacherCourses(teacherId: number): Promise<TeacherCourse[]> {
    const response = await apiRequest<TeacherCoursesResponse>(`/teachers/${teacherId}/courses`);
    return response.data;
  },

  async getEnrolledStudents(courseGroupId: string): Promise<EnrolledStudent[]> {
    const response = await apiRequest<EnrolledStudentsResponse>(`/courses/${courseGroupId}/students`);
    return response.data;
  },

  async updateStudentStatus(
    courseGroupId: string,
    studentKey: string,
    status: EnrolledStudent['status'],
    reason: string,
  ): Promise<void> {
    await apiRequest(`/courses/${courseGroupId}/students/${studentKey}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        reason: status === 'INHABILITADO' ? reason : null,
      }),
    });
  },
};
