import { apiRequest } from "./apiClient";
import type {
    CourseExam,
    CourseExamsResponse,
    ScheduleExamPayload,
    ScheduledExam,
    ScheduledExamsResponse,
} from "../types/exam";

export const examService = {
    async getCourseExams(courseGroupId: string): Promise<CourseExam[]> {
        const response = await apiRequest<CourseExamsResponse>(`/courses/${courseGroupId}/exams`);
        if (response && Array.isArray(response.data)) {
            return response.data;
        }
        return [];
    },

    /** Exámenes programados de un grupo, con las aulas asignadas. */
    async getScheduledExams(courseGroupId: string): Promise<ScheduledExam[]> {
        const response = await apiRequest<ScheduledExamsResponse>(`/courses/${courseGroupId}/exams`);
        return Array.isArray(response?.data) ? response.data : [];
    },

    async scheduleExam(courseGroupId: string, payload: ScheduleExamPayload): Promise<void> {
        await apiRequest<{ success: boolean; message: string }>(`/courses/${courseGroupId}/exams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },
};
