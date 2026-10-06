import { apiRequest } from "./apiClient";
import type { AvailableRoom, AvailableRoomsResponse, CourseExam, CourseExamsResponse, ScheduleExamPayload, StudentEnrollmentCheckResponse } from "../types/exam";

export const examService = {
    async getCourseExams(courseGroupId: string | number): Promise<CourseExam[]> {
        const response = await apiRequest<CourseExamsResponse>(`/courses/${courseGroupId}/exams`);
        if (response && Array.isArray(response.data)) {
            return response.data;
        }
        return [];
    },

    async scheduleExam(courseGroupId: string | number, payload: ScheduleExamPayload): Promise<{ success: boolean; message: string }> {
        return await apiRequest<{ success: boolean; message: string }>(`/courses/${courseGroupId}/exams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    },

    async getAvailableRooms(date: string, startTime: string): Promise<AvailableRoom[]> {
        try {
            const response = await apiRequest<AvailableRoomsResponse>(`/rooms/available?date=${encodeURIComponent(date)}&startTime=${encodeURIComponent(startTime)}`);
            if (response && Array.isArray(response.data)) {
                return response.data;
            }
        } catch {
            // Fallback to all rooms from catalog if query fails
        }

        try {
            const fallback = await apiRequest<{ success: boolean; data: Array<{ value: number; label: string; capacity: number }> }>('/catalog/rooms');
            if (fallback && Array.isArray(fallback.data)) {
                return fallback.data.map((r) => ({
                    room_id: r.value,
                    room_name: r.label,
                    capacity: r.capacity,
                }));
            }
        } catch {
            // ignore
        }

        return [];
    },

    async checkStudentEnrollment(courseGroupId: string | number, codigoSis: string): Promise<StudentEnrollmentCheckResponse> {
        try {
            return await apiRequest<StudentEnrollmentCheckResponse>(`/courses/${courseGroupId}/check-enrollment?codigo_sis=${encodeURIComponent(codigoSis)}`);
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Estudiante no encontrado en la materia.',
                data: null,
            };
        }
    },

    async getExamTypes(): Promise<Array<{ value: number; label: string }>> {
        try {
            const response = await apiRequest<{ success: boolean; data: Array<{ value: number; label: string }> }>('/catalog/exam-types');
            if (response && Array.isArray(response.data)) {
                return response.data;
            }
        } catch {
            // ignore
        }

        return [
            { value: 1, label: 'PRIMER PARCIAL' },
            { value: 2, label: 'SEGUNDO PARCIAL' },
            { value: 3, label: 'EXAMEN FINAL' },
            { value: 4, label: 'SEGUNDA INSTANCIA' },
            { value: 5, label: 'EXAMEN DE MESA' },
        ];
    },
};
