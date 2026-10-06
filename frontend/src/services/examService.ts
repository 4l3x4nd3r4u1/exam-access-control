import { apiRequest } from './apiClient';

import type {
  AvailableRoom,
  AvailableRoomsResponse,
  CourseExam,
  CourseExamsResponse,
  ExamType,
  ExamTypesResponse,
  ScheduleExamPayload,
} from '../types/exam';

export const examService = {
  async getCourseExams(
    courseGroupId: string,
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

  async scheduleExam(
    courseGroupId: string,
    payload: ScheduleExamPayload,
  ): Promise<void> {
    await apiRequest<{
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