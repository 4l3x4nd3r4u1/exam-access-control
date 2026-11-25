import { API_BASE_URL, apiRequest, createApiHeaders } from './apiClient';
import type {
  DetailedExamDetailResponse,
  DetailedExamReportDetail,
  FinishedExamItem,
  FinishedExamsResponse,
  GenerateDetailedReportResponse,
} from '../types/detailedExamReport';

export interface FinishedExamsParams {
  search?: string;
  exam_type?: string;
  gestion?: string;
}

export interface FinishedExamsResult {
  exams: FinishedExamItem[];
  examTypes: string[];
  gestiones: string[];
}

export const detailedExamReportService = {
  async getFinishedExams(
    params: FinishedExamsParams = {},
  ): Promise<FinishedExamsResult> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.exam_type) query.set('exam_type', params.exam_type);
    if (params.gestion) query.set('gestion', params.gestion);

    const qs = query.toString();
    const response = await apiRequest<FinishedExamsResponse>(
      `/detailed-exam-reports/finished-exams${qs ? `?${qs}` : ''}`,
    );

    return {
      exams: response.data,
      examTypes: response.meta?.exam_types ?? [],
      gestiones: response.meta?.gestiones ?? [],
    };
  },

  async getExamDetail(examId: string | number): Promise<DetailedExamReportDetail> {
    const response = await apiRequest<DetailedExamDetailResponse>(
      `/detailed-exam-reports/${encodeURIComponent(String(examId))}`,
    );
    return response.data;
  },

  async generateReport(examId: string | number) {
    const response = await apiRequest<GenerateDetailedReportResponse>(
      `/detailed-exam-reports/${encodeURIComponent(String(examId))}/generate`,
      { method: 'POST' },
    );
    return response.data;
  },

  async downloadReportPdf(
    examId: string | number,
    reportId: number,
    fileName?: string,
  ): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/detailed-exam-reports/${encodeURIComponent(String(examId))}/${reportId}/pdf`,
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
    link.download = fileName || `reporte-detallado-examen-${examId}-${reportId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  },
};
