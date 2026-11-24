import { apiRequest } from './apiClient';
import type {
  BlackListResponse,
  BlackListDetailResponse,
  BlackListSort,
  BlackListStudent,
} from '../types/blackList';

export interface BlackListQueryParams {
  search?: string;
  type?: 'all' | 'expulsions';
  gestion?: string;
  sort?: BlackListSort;
}

export interface BlackListListResult {
  students: BlackListStudent[];
  availableGestiones: string[];
}

export const blackListService = {
  async getStudents(
    params: BlackListQueryParams = {},
  ): Promise<BlackListListResult> {
    const query = new URLSearchParams();

    if (params.search) {
      query.set('search', params.search);
    }

    query.set('type', params.type ?? 'expulsions');

    if (params.gestion) {
      query.set('gestion', params.gestion);
    }

    if (params.sort) {
      query.set('sort', params.sort);
    }

    const qs = query.toString();
    const response = await apiRequest<BlackListResponse>(
      `/blacklist${qs ? `?${qs}` : ''}`,
    );

    return {
      students: response.data,
      availableGestiones: response.meta?.available_gestiones ?? [],
    };
  },

  async getStudentDetail(
    userId: number,
    type: 'all' | 'expulsions' = 'expulsions',
  ) {
    const response = await apiRequest<BlackListDetailResponse>(
      `/blacklist/${userId}?type=${encodeURIComponent(type)}`,
    );

    return response.data;
  },
};
