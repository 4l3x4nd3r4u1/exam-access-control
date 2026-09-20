import type { AcademicStaffMember, NewStaffPayload, StaffListResponse } from '../types/staff';
import type { UserRole } from '../types/auth';
import { apiRequest } from './apiClient';

// Fallback in-memory list seeded with Figma design items (35 usuarios)
let mockStaffList: AcademicStaffMember[] = [
  { user_id: 1, full_name: 'Escalera Balderrama Eddy', email: 'eddy@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 2, full_name: 'Blando Coca Leticia', email: 'leticia@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 3, full_name: 'Villarroel Tapia Boris', email: 'boris@fcyt.umss.edu.bo', role: 'ASSISTANT', is_active: true },
  { user_id: 4, full_name: 'Blando Coca Leticia', email: 'leticia.b@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 5, full_name: 'Escalera Balderrama Eddy', email: 'eddy.e@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 6, full_name: 'Villarroel Tapia Boris', email: 'boris.v@fcyt.umss.edu.bo', role: 'ASSISTANT', is_active: true },
  { user_id: 7, full_name: 'Escalera Balderrama Eddy', email: 'e.escalera7@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 8, full_name: 'Blando Coca Leticia', email: 'l.blanco8@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 9, full_name: 'Villarroel Tapia Boris', email: 'b.villarroel9@fcyt.umss.edu.bo', role: 'ASSISTANT', is_active: true },
  { user_id: 10, full_name: 'Blando Coca Leticia', email: 'l.blanco10@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 11, full_name: 'Escalera Balderrama Eddy', email: 'e.escalera11@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 12, full_name: 'Villarroel Tapia Boris', email: 'b.villarroel12@fcyt.umss.edu.bo', role: 'ASSISTANT', is_active: true },
  { user_id: 13, full_name: 'Escalera Balderrama Eddy', email: 'e.escalera13@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 14, full_name: 'Blando Coca Leticia', email: 'l.blanco14@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 15, full_name: 'Villarroel Tapia Boris', email: 'b.villarroel15@fcyt.umss.edu.bo', role: 'ASSISTANT', is_active: true },
  { user_id: 16, full_name: 'Blando Coca Leticia', email: 'l.blanco16@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 17, full_name: 'Escalera Balderrama Eddy', email: 'e.escalera17@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 18, full_name: 'Costas Jauregui Patricia', email: 'p.costas@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 19, full_name: 'Jaldin Salazar Rosemary', email: 'r.jaldin@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 20, full_name: 'Orellana Araoz Jorge', email: 'j.orellana@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 21, full_name: 'Salazar Fuentes Carlos', email: 'c.salazar@fcyt.umss.edu.bo', role: 'ASSISTANT', is_active: true },
  { user_id: 22, full_name: 'Montaño Claros David', email: 'd.montano@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 23, full_name: 'Torrico Rocha Ana', email: 'a.torrico@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 24, full_name: 'Camacho Fernandez Luis', email: 'l.camacho@fcyt.umss.edu.bo', role: 'ASSISTANT', is_active: true },
  { user_id: 25, full_name: 'Guzman Rivera Daniel', email: 'd.guzman@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 26, full_name: 'Vargas Zeballos Mario', email: 'm.vargas@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 27, full_name: 'Paz Soldan Marcelo', email: 'm.paz@fcyt.umss.edu.bo', role: 'ASSISTANT', is_active: true },
  { user_id: 28, full_name: 'Alvarez Quiroga Sofia', email: 's.alvarez@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 29, full_name: 'Medrano Castro Elena', email: 'e.medrano@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 30, full_name: 'Quispe Mamani Rodrigo', email: 'r.quispe@fcyt.umss.edu.bo', role: 'ASSISTANT', is_active: true },
  { user_id: 31, full_name: 'Rios Morales Gabriel', email: 'g.rios@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 32, full_name: 'Flores Condori Andrea', email: 'a.flores@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
  { user_id: 33, full_name: 'Chavez Pardo Victor', email: 'v.chavez@fcyt.umss.edu.bo', role: 'ASSISTANT', is_active: true },
  { user_id: 34, full_name: 'Perez Gomez Juan', email: 'admin@umss.edu.bo', role: 'ADMIN', is_active: true },
  { user_id: 35, full_name: 'Escalera Balderrama Eddy', email: 'e.escalera35@fcyt.umss.edu.bo', role: 'TEACHER', is_active: true },
];

export const staffService = {
  async getStaff(): Promise<AcademicStaffMember[]> {
    try {
      const res = await apiRequest<StaffListResponse>('/academic-staff');
      return res.data;
    } catch (err) {
      console.error('Error al obtener personal del backend, usando fallback:', err);
      return [...mockStaffList];
    }
  },

  async createStaff(payload: NewStaffPayload): Promise<AcademicStaffMember> {
    const roleMapping: Record<UserRole, string> = {
      TEACHER: 'DOCENTE',
      ASSISTANT: 'AUXILIAR',
      ADMIN: 'ADMIN',
    };

    try {
      await apiRequest('/academic-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: payload.name.trim(),
          email: payload.email.toLowerCase().trim(),
          password: payload.password,
          role: roleMapping[payload.role] || 'DOCENTE',
        }),
      });

      const newMember: AcademicStaffMember = {
        user_id: Date.now(),
        full_name: payload.name.trim(),
        email: payload.email.toLowerCase().trim(),
        role: payload.role,
        is_active: true,
      };

      mockStaffList.unshift(newMember);
      return newMember;
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

  async updateStaff(
    userId: number,
    payload: { fullName: string; email: string; role: UserRole },
    token?: string
  ): Promise<AcademicStaffMember> {
    try {
      await apiRequest(`/academic-staff/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fullName: payload.fullName,
          full_name: payload.fullName, // Compatibilidad con el backend
          email: payload.email,
          role: payload.role,
        }),
      });
    } catch (err) {
      console.warn('API update endpoint fallback to local state:', err);
    }

    mockStaffList = mockStaffList.map((s) =>
      s.user_id === userId ? { ...s, full_name: payload.fullName, email: payload.email, role: payload.role } : s
    );

    return {
      user_id: userId,
      full_name: payload.fullName,
      email: payload.email,
      role: payload.role,
      is_active: true,
    };
  },
};
