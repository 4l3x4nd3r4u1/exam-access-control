import { apiRequest } from './apiClient';

export interface CatalogItem {
  value: number | string;
  label: string;
  description?: string;
}

export interface CatalogResponse<T> {
  success: boolean;
  data: T[];
  message: string;
}

let rolesCache: CatalogItem[] | null = null;
let inFlightRolesPromise: Promise<CatalogItem[]> | null = null;

export const catalogService = {
  getCachedRoles(): CatalogItem[] | null {
    return rolesCache;
  },

  async getRoles(forceRefresh = false): Promise<CatalogItem[]> {
    if (!forceRefresh && rolesCache !== null) {
      return rolesCache;
    }

    if (inFlightRolesPromise) {
      return inFlightRolesPromise;
    }

    inFlightRolesPromise = apiRequest<CatalogResponse<CatalogItem>>('/catalog/roles')
      .then((response) => {
        rolesCache = response.data;
        return response.data;
      })
      .finally(() => {
        inFlightRolesPromise = null;
      });

    return inFlightRolesPromise;
  },

  async getFunctions(): Promise<CatalogItem[]> {
    const response = await apiRequest<CatalogResponse<CatalogItem>>('/catalog/functions');
    return response.data;
  },

  async getCourseGroups(): Promise<CourseGroupCatalogItem[]> {
    const response = await apiRequest<CatalogResponse<CourseGroupCatalogItem>>('/catalog/course-groups');
    return response.data;
  },
};

export interface CourseGroupCatalogItem {
  value: string;
  label: string;
  course_group_id: string;
  sigla: string;
  course_name: string;
  group_code: string;
  gestion: string;
  teacher_id: number;
}
