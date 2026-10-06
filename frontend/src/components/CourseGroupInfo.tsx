import { useTeacherName } from '../hooks/useTeacherName';
import type { CourseGroup } from '../types/course';

interface CourseGroupInfoProps {
  courseGroup: CourseGroup;
}

/** Bloque "Gestión / Grupo / Docente" que encabeza ambas vistas. */
export function CourseGroupInfo({ courseGroup }: CourseGroupInfoProps) {
  const teacherName = useTeacherName(courseGroup.teacher_id);

  return (
    <dl className="cg-info">
      <div>
        <dt>Gestion:</dt>
        <dd>{courseGroup.academic_term}</dd>
      </div>
      <div>
        <dt>Grupo:</dt>
        <dd>{courseGroup.group_code}</dd>
      </div>
      <div>
        <dt>Docente</dt>
        <dd>{teacherName}</dd>
      </div>
    </dl>
  );
}
