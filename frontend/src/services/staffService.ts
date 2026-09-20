import type { AcademicStaffMember, NewStaffPayload, StaffListResponse } from '../types/staff';
import type { UserRole } from '../types/auth';
import { apiRequest } from './apiClient';

export const staffService = {
  async getStaff(): Promise<AcademicStaffMember[]> {
    const res = await apiRequest<StaffListResponse>('/academic-staff');
    return res.data || [];
  },

  async createStaff(payload: NewStaffPayload): Promise<AcademicStaffMember> {
    const roleMapping: Record<UserRole, string> = {
      TEACHER: 'DOCENTE',
      ASSISTANT: 'AUXILIAR',
      ADMIN: 'ADMIN',
    };

    const res = await apiRequest<{ success: boolean; message: string; data?: any }>('/academic-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: payload.name.trim(),
        email: payload.email.toLowerCase().trim(),
        password: payload.password,
        role: roleMapping[payload.role] || 'DOCENTE',
      }),
    });

    return {
      user_id: Date.now(),
      full_name: payload.name.trim(),
      email: payload.email.toLowerCase().trim(),
      role: payload.role,
      is_active: true,
    };
  },

  async updateStaff(
    userId: number,
    payload: { fullName: string; email: string; role: UserRole },
    token?: string
  ): Promise<AcademicStaffMember> {
    const roleMapping: Record<UserRole, string> = {
      TEACHER: 'DOCENTE',
      ASSISTANT: 'AUXILIAR',
      ADMIN: 'ADMIN',
    };

    await apiRequest(`/academic-users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        fullName: payload.fullName.trim(),
        email: payload.email.toLowerCase().trim(),
        role: roleMapping[payload.role] || 'DOCENTE',
      }),
    });

    return {
      user_id: userId,
      full_name: payload.fullName,
      email: payload.email,
      role: payload.role,
      is_active: true,
    };
  },
};
