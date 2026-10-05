import { apiRequest } from './apiClient';
import type {
  ProcessedRoster,
  ProcessedRostersResponse,
  ProcessedRosterDetailData,
  ProcessedRosterDetailResponse,
} from '../types/processedRoster';

export const processedRostersService = {
  async getProcessedRosters(): Promise<ProcessedRoster[]> {
    const response = await apiRequest<ProcessedRostersResponse>('/processed-rosters');
    return response.data;
  },

  async getProcessedRosterDetail(courseGroupId: string | number): Promise<ProcessedRosterDetailData> {
    const response = await apiRequest<ProcessedRosterDetailResponse>(`/processed-rosters/${courseGroupId}`);
    return response.data;
  },
};
