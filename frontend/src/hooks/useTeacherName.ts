import { useEffect, useState } from 'react';

import { staffService } from '../services/staffService';

/**
 * Resuelve el nombre del docente a partir de su user_id.
 * GET /course-groups solo devuelve `teacher_id`, así que se cruza con
 * GET /academic-staff (que staffService mantiene en caché).
 */
export function useTeacherName(teacherId: number | null | undefined): string {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setName(null);

    if (!teacherId) return undefined;

    staffService
      .getAcademicStaff()
      .then((members) => {
        const teacher = members.find((member) => member.user_id === teacherId);
        if (isMounted) setName(teacher?.full_name ?? '');
      })
      .catch(() => {
        if (isMounted) setName('');
      });

    return () => {
      isMounted = false;
    };
  }, [teacherId]);

  if (!teacherId) return 'Sin docente asignado';
  if (name === null) return 'Cargando...';
  return name || 'No disponible';
}
