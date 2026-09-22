import { apiRequest } from './apiClient';
import type { ProcessedRoster, ProcessedRostersResponse, RosterStudent, RosterStudentsResponse } from '../types/processedRoster';

export const processedRostersService = {
  async getProcessedRosters(): Promise<ProcessedRoster[]> {
    const response = await apiRequest<ProcessedRostersResponse>('/processed-rosters');
    return response.data;
  },

  async getRosterStudents(courseGroupId: string): Promise<RosterStudent[]> {
    const response = await apiRequest<RosterStudentsResponse>(`/courses/${courseGroupId}/students`);
    return response.data;
  },
};
