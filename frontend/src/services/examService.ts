import { apiRequest } from "./apiClient";
import type { CourseExam, CourseExamsResponse } from "../types/exam";

const mockExams: CourseExam[] = [
    {
        id: 1,
        course_group_id: "1",
        title: "Primer Parcial",
        date: "12/10/2026",
        start_time: "08:15",
        end_time: "09:45",
        status: "Finalizado",
    },
    {
        id: 2,
        course_group_id: "1",
        title: "Segundo Parcial",
        date: "07/12/2026",
        start_time: "08:15",
        end_time: "09:45",
        status: "En curso",
    },
    {
        id: 3,
        course_group_id: "1",
        title: "Examen Final",
        date: "14/12/2026",
        start_time: "08:15",
        end_time: "09:45",
        status: "Próximamente",
    },
];

export const examService = {
    async getCourseExams(courseGroupId: string): Promise<CourseExam[]> {
        try {
            const response = await apiRequest<CourseExamsResponse>(`/courses/${courseGroupId}/exams`);
            if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
                return response.data;
            }
            return mockExams;
        } catch {
            return mockExams;
        }
    },
};
