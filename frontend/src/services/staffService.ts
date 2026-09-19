import type { AcademicStaffMember, NewStaffPayload, StaffListResponse, StaffCreateResponse } from '../types/staff';
import { apiRequest } from './apiClient';

// Fallback in-memory list seeded with Figma design items
let mockStaffList: AcademicStaffMember[] = [
  { user_id: 1, full_name: 'Escalera Balderrama Eddy', email: 'e.escalera@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 2, full_name: 'Blando Coca Leticia', email: 'l.blanco@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 3, full_name: 'Villarroel Tapia Boris', email: 'b.villarroel@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 4, full_name: 'Costas Jauregui Patricia', email: 'p.costas@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 5, full_name: 'Jaldin Salazar Rosemary', email: 'r.jaldin@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 6, full_name: 'Orellana Araoz Jorge', email: 'j.orellana@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
];

export const staffService = {
  async getStaff(): Promise<AcademicStaffMember[]> {
    try {
      const res = await apiRequest<StaffListResponse>('/academic-staff');
      return res.data;
    } catch {
      return [...mockStaffList];
    }
  },

  async createStaff(payload: NewStaffPayload): Promise<AcademicStaffMember> {
    try {
      const res = await apiRequest<StaffCreateResponse>('/academic-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      mockStaffList.unshift(res.data);
      return res.data;
    } catch {
      // Si el servidor falla o está offline, realizamos validación local y agregamos a mock
      const emailLower = payload.email.toLowerCase();
      const exists = mockStaffList.some((s) => s.email.toLowerCase() === emailLower);
      if (exists) {
        throw new Error('El correo electrónico ya se encuentra registrado.');
      }

      const newMember: AcademicStaffMember = {
        user_id: Date.now(),
        full_name: payload.name.trim(),
        email: emailLower,
        role: payload.role,
        is_active: true,
      };

      mockStaffList.unshift(newMember);
      return newMember;
    }
  },
};
