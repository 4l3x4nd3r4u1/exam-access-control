import { apiRequest } from './apiClient';

import type {
  AvailableRoom,
  AvailableRoomsResponse,
  CourseExam,
  CourseExamsResponse,
  ExamType,
  ExamTypesResponse,
  ScheduleExamPayload,
  StudentEnrollmentCheckResponse,
} from '../types/exam';

export const examService = {
  async getCourseExams(
    courseGroupId: string | number,
  ): Promise<CourseExam[]> {
    const response =
      await apiRequest<CourseExamsResponse>(
        `/courses/${courseGroupId}/exams`,
      );

    return Array.isArray(response.data)
      ? response.data
      : [];
  },

  async getExamTypes(): Promise<ExamType[]> {
    const response =
      await apiRequest<ExamTypesResponse>(
        '/catalog/exam-types',
      );

    return Array.isArray(response.data)
      ? response.data
      : [];
  },

  async getAvailableRooms(
    date: string,
    startTime: string,
  ): Promise<AvailableRoom[]> {
    const params = new URLSearchParams({
      date,
      startTime,
    });

    const response =
      await apiRequest<AvailableRoomsResponse>(
        `/rooms/available?${params.toString()}`,
      );

    return Array.isArray(response.data)
      ? response.data
      : [];
  },

  async checkStudentEnrollment(
    courseGroupId: string | number,
    codigoSis: string,
  ): Promise<StudentEnrollmentCheckResponse> {
    try {
      return await apiRequest<StudentEnrollmentCheckResponse>(
        `/courses/${courseGroupId}/check-enrollment?codigo_sis=${encodeURIComponent(
          codigoSis,
        )}`,
      );
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Estudiante no encontrado en la materia.',
        data: null,
      };
    }
  },

  async scheduleExam(
    courseGroupId: string | number,
    payload: ScheduleExamPayload,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    return await apiRequest<{
      success: boolean;
      message: string;
    }>(
      `/courses/${courseGroupId}/exams`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },
};