import { apiRequest, API_BASE_URL, createApiHeaders } from './apiClient';

export interface ExamReport {
  id: number;
  descripcion: string;
  fecha: string;
  usuario_id: number;
}

interface ExamReportsResponse {
  success: boolean;
  data: ExamReport[];
}

interface CreateExamReportResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
  };
}

export const examReportService = {
  async getReports(examId: string | number): Promise<ExamReport[]> {
    const response = await apiRequest<ExamReportsResponse>(
      `/exams/${examId}/reports`,
    );

    return response.data;
  },

  async createReport(
    examId: string | number,
    descripcion: string,
  ): Promise<CreateExamReportResponse> {
    return apiRequest<CreateExamReportResponse>(
      `/exams/${examId}/reports`,
      {
        method: 'POST',
        body: JSON.stringify({ descripcion }),
      },
    );
  },

  async downloadReport(
    examId: string | number,
    reportId: number,
  ): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/exams/${examId}/reports/${reportId}/pdf`,
      {
        headers: createApiHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error('No se pudo descargar el reporte PDF.');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-examen-${examId}-${reportId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  },
};
