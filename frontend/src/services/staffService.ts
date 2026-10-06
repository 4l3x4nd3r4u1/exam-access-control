import type { AcademicStaffMember, AcademicStaffResponse, AcademicUserRegistrationData, AcademicUserUpdateData, PersonalDataUpdatePayload } from '../types/staff';
import { apiRequest } from './apiClient';

let staffCache: AcademicStaffMember[] | null = null;
let inFlightPromise: Promise<AcademicStaffMember[]> | null = null;

export const staffService = {
  getCachedStaff(): AcademicStaffMember[] | null {
    return staffCache;
  },

  async getAcademicStaff(forceRefresh = false): Promise<AcademicStaffMember[]> {
    if (!forceRefresh && staffCache !== null) {
      return staffCache;
    }

    if (inFlightPromise) {
      return inFlightPromise;
    }

    inFlightPromise = apiRequest<AcademicStaffResponse>('/academic-staff')
      .then((response) => {
        staffCache = response.data;
        return response.data;
      })
      .finally(() => {
        inFlightPromise = null;
      });

    return inFlightPromise;
  },

  async registerAcademicUser(data: AcademicUserRegistrationData): Promise<void> {
    await apiRequest('/academic-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        roles: [data.role],
      }),
    });

    staffCache = null;
  },

  async updateAcademicUser(userId: number, data: AcademicUserUpdateData): Promise<void> {
    await apiRequest(`/academic-users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    staffCache = null;
  },

  async updateUserRoles(userId: number, roles: string[]): Promise<{ success: boolean; message: string }> {
    const result = await apiRequest<{ success: boolean; message: string }>(`/academic-users/${userId}/roles`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, roles }),
    });

    if (staffCache) {
      staffCache = staffCache.map((item) =>
        item.user_id === userId ? { ...item, roles, role: roles.join(', ') } : item
      );
    }

    return result;
  },

  async updatePersonalData(data: PersonalDataUpdatePayload): Promise<{ success: boolean; message: string }> {
    const result = await apiRequest<{ success: boolean; message: string }>('/academic-users/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    staffCache = null;
    return result;
  },

  clearCache(): void {
    staffCache = null;
  },
};
