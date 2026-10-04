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

const fallbackRoles: CatalogItem[] = [
  { value: 'DOCENTE', label: 'DOCENTE', description: 'Docente titular o interino' },
  { value: 'AUXILIAR', label: 'AUXILIAR', description: 'Auxiliar de docencia' },
  { value: 'ADMIN', label: 'ADMIN', description: 'Administrador del sistema' },
];

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

    inFlightRolesPromise = (async () => {
      try {
        const response = await apiRequest<CatalogResponse<CatalogItem>>('/catalog/roles');
        rolesCache = response.data;
        return response.data;
      } catch (error) {
        console.warn('Unable to load roles catalog, using fallback:', error);
        rolesCache = fallbackRoles;
        return fallbackRoles;
      } finally {
        inFlightRolesPromise = null;
      }
    })();

    return inFlightRolesPromise;
  },

  async getFunctions(): Promise<CatalogItem[]> {
    const response = await apiRequest<CatalogResponse<CatalogItem>>('/catalog/functions');
    return response.data;
  },
};
