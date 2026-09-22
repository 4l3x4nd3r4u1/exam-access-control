import type { AcademicStaffMember, AcademicStaffResponse, AcademicUserRegistrationData, AcademicUserUpdateData } from '../types/staff';
import { apiRequest } from './apiClient';

export const staffService = {
  async getAcademicStaff(): Promise<AcademicStaffMember[]> {
    const response = await apiRequest<AcademicStaffResponse>('/academic-staff');
    return response.data;
  },

  async registerAcademicUser(data: AcademicUserRegistrationData): Promise<void> {
    await apiRequest('/academic-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateAcademicUser(userId: number, data: AcademicUserUpdateData): Promise<void> {
    await apiRequest(`/academic-users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
};
