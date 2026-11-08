import { apiRequest } from './apiClient';
import type {
  BlackListResponse,
  BlackListDetailResponse,
} from '../types/blackList';

export const blackListService = {
  async getStudents(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await apiRequest<BlackListResponse>(`/blacklist${query}`);

    return response.data;
  },

  async getStudentDetail(userId: number) {
    const response = await apiRequest<BlackListDetailResponse>(
      `/blacklist/${userId}`,
    );

    return response.data;
  },
};
