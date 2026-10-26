import { ControlPointIcon } from '../components/ControlPointIcon';
import { formatExamType } from '../utils/examFormat';
import type { ControlPointSelection } from '../types/controlPoint';
import '../styles/controlPoints.css';

interface ControlPointIngressViewProps {
  selection: ControlPointSelection;
  onBack: () => void;
}

export function ControlPointIngressView({ selection, onBack }: ControlPointIngressViewProps) {
  const { exam, room } = selection;
  return (
    <main className="app-shell cp-screen cp-ingress">
      <header className="cp-topbar">
        <button className="cp-icon-button" type="button" onClick={onBack} aria-label="Volver a puntos de control"><ControlPointIcon name="back" /></button>
        <span className="cp-eyebrow">Control de acceso</span>
      </header>
      <section className="cp-exam-heading" aria-label="Punto de control seleccionado">
        <h1>{exam.subject_name}</h1>
        <p><ControlPointIcon name="exam" />{formatExamType(exam.exam_type)} · G{exam.group}</p>
        <p><ControlPointIcon name="room" />{room.room_name}</p>
      </section>
    </main>
  );
}
