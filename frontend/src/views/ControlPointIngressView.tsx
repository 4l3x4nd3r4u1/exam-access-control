import { useEffect, useState } from 'react';
import { ControlPointIcon } from '../components/ControlPointIcon';
import { ControlPointStudentSearch } from '../components/ControlPointStudentSearch';
import { controlPointService } from '../services/controlPointService';
import { getControlPointStatus } from '../utils/controlPoint';
import { formatExamType } from '../utils/examFormat';
import type { ControlPointSelection } from '../types/controlPoint';
import type { EnrolledStudent } from '../types/course';
import '../styles/controlPoints.css';

interface ControlPointIngressViewProps {
  selection: ControlPointSelection;
  onBack: () => void;
}

export function ControlPointIngressView({ selection, onBack }: ControlPointIngressViewProps) {
  const { exam, room } = selection;
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [query, setQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<EnrolledStudent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const status = getControlPointStatus(exam, now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    controlPointService.getStudents(exam.course_group_id, controller.signal)
      .then((items) => { if (!controller.signal.aborted) setStudents(items); })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar los estudiantes.');
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [exam.course_group_id, attempt]);

  const changeQuery = (value: string) => { setQuery(value); setSelectedStudent(null); };
  return (
    <main className="app-shell cp-screen cp-ingress">
      <header className="cp-topbar">
        <button className="cp-icon-button" type="button" onClick={onBack} aria-label="Volver a puntos de control"><ControlPointIcon name="back" /></button>
        <span className="cp-eyebrow">Control de acceso</span>
        <span className="cp-current-status"><span className={`cp-status-dot cp-status-${status.replaceAll(' ', '-').toLowerCase()}`} />{status}</span>
      </header>
      <section className="cp-exam-heading" aria-label="Punto de control seleccionado">
        <h1>{exam.subject_name}</h1>
        <p><ControlPointIcon name="exam" />{formatExamType(exam.exam_type)} · G{exam.group}</p>
        <p><ControlPointIcon name="room" />{room.room_name}</p>
      </section>
      <div className="cp-tabs" aria-label="Modo de control">
        <span className="cp-tab-active">Ingreso</span>
        <button type="button" disabled title="Disponible en una próxima etapa">Durante el examen</button>
      </div>
      {exam.general_rules.length > 0 && <details className="cp-rules"><summary>Normas generales <span>{exam.general_rules.length}</span></summary><ul>{exam.general_rules.map((rule, index) => <li key={index}>{rule}</li>)}</ul></details>}
      <ControlPointStudentSearch students={students} query={query} onQueryChange={changeQuery} onSelect={(student) => { setSelectedStudent(student); setQuery(student.studentKey || student.ci); }} isLoading={isLoading} error={error} onRetry={() => { setError(null); setIsLoading(true); setAttempt((value) => value + 1); }} showSuggestions={!selectedStudent} />
      {selectedStudent && <section className="cp-selected-student" aria-label="Estudiante seleccionado"><strong>{selectedStudent.fullName}</strong><p>SIS {selectedStudent.studentKey} · CI {selectedStudent.ci}</p></section>}
    </main>
  );
}
