import { useEffect, useState } from 'react';
import { ControlPointIcon } from '../components/ControlPointIcon';
import { controlPointService } from '../services/controlPointService';
import { canUseControlPoint } from '../utils/controlPoint';
import { formatExamType, formatTime } from '../utils/examFormat';
import type { ControlPointExam, ControlPointSelection } from '../types/controlPoint';
import '../styles/controlPoints.css';

interface ControlPointsViewProps {
  userId: number;
  onBack: () => void;
  onSelect: (selection: ControlPointSelection) => void;
}

export function ControlPointsView({ userId, onBack, onSelect }: ControlPointsViewProps) {
  const [exams, setExams] = useState<ControlPointExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    controlPointService.getExams(controller.signal)
      .then((items) => { if (!controller.signal.aborted) setExams(items); })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar los puntos de control.');
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  const retry = () => { setError(null); setIsLoading(true); setAttempt((value) => value + 1); };

  return (
    <main className="app-shell cp-screen cp-picker">
      <header className="cp-topbar">
        <button className="cp-icon-button" type="button" onClick={onBack} aria-label="Volver al panel"><ControlPointIcon name="back" /></button>
        <h1>Puntos de control</h1>
      </header>
      <div className="cp-count"><span>Materias</span><span>{new Set(exams.map((exam) => exam.course_group_id)).size}</span></div>
      {isLoading && <p className="cp-feedback" role="status">Cargando puntos de control...</p>}
      {error && <div className="cp-feedback cp-error" role="alert"><p>{error}</p><button type="button" className="cp-text-button" onClick={retry}>Reintentar</button></div>}
      {!isLoading && !error && (
        <section className="cp-exam-list" aria-label="Exámenes y aulas de control">
          {exams.map((exam) => (
            <details className="cp-exam-row" key={exam.exam_id}>
              <summary>
                <span className="cp-exam-name">{exam.subject_name}</span>
                <span className="cp-chip">G{exam.group}</span>
                <span className="cp-chip" title={formatExamType(exam.exam_type)}>{formatExamType(exam.exam_type)}</span>
                <ControlPointIcon name="chevron" />
              </summary>
              <div className="cp-room-list">
                <p className="cp-muted">{exam.date} · {formatTime(exam.start_time)}–{formatTime(exam.end_time)}</p>
                {exam.rooms.map((room) => {
                  const allowed = canUseControlPoint(room, userId);
                  return (
                    <button type="button" className="cp-room-button" key={room.room_id} disabled={!allowed} onClick={() => { if (allowed) onSelect({ exam, room }); }}>
                      <ControlPointIcon name="room" />
                      <span><strong>{room.room_name}</strong><small>{allowed ? 'Asignada a ti · Abrir control' : room.assistant_id == null ? 'Sin responsable asignado' : 'Asignada a otro responsable'}</small></span>
                      {allowed && <ControlPointIcon name="chevron" />}
                    </button>
                  );
                })}
                {exam.rooms.length === 0 && <p className="cp-muted">Sin aulas asignadas.</p>}
              </div>
            </details>
          ))}
          {exams.length === 0 && <p className="cp-feedback">No hay exámenes disponibles.</p>}
          {exams.length > 0 && !exams.some((exam) => exam.rooms.some((room) => canUseControlPoint(room, userId))) && <p className="cp-feedback">No tienes aulas asignadas para controlar. Puedes consultar los exámenes disponibles.</p>}
        </section>
      )}
      <button className="cp-primary cp-cancel" type="button" onClick={onBack}>Cancelar</button>
    </main>
  );
}
