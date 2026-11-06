import { ControlPointIcon } from './ControlPointIcon';
import { formatExamType } from '../utils/examFormat';
import type { ExamAccessResponse } from '../types/controlPoint';

export function ControlPointAccessResult({ response }: { response: ExamAccessResponse }) {
  const { student, access, expulsion_history: history } = response.data;
  const tone = access.result === 'HABILITADO' || access.result === 'YA REGISTRÓ INGRESO'
    ? 'allowed' : access.result === 'AULA INCORRECTA' ? 'warning' : 'denied';
  return (
    <section className="cp-access-result" aria-label="Resultado del ingreso" aria-live="polite">
      {student && <div className="cp-selected-student"><strong>{student.full_name}</strong><p>SIS {student.codigo_sis} · CI {student.ci || '—'}</p></div>}
      <div className={`cp-result-card cp-result-${tone}`}>
        <h2><span className="cp-result-dot" />{access.result}</h2>
        <p>{access.result === 'HABILITADO' && access.check_in_time ? 'Ingreso registrado automáticamente.' : response.message}</p>
        {access.check_in_time && <p>Hora de ingreso: <strong>{access.check_in_time}</strong></p>}
        {access.assigned_room_name && <p>Aula asignada: <strong>{access.assigned_room_name}</strong></p>}
        {access.ineligibility_reason && <p>{access.ineligibility_reason}</p>}
      </div>
      {access.norma_particular && <div className="cp-particular-rule"><strong>Norma particular</strong><p>{access.norma_particular}</p></div>}
      <section className="cp-history" aria-label="Historial de expulsiones">
        <h3><ControlPointIcon name="ban" />Expulsiones</h3>
        {history.length === 0 ? <p className="cp-muted">Sin expulsiones registradas.</p> : (
          <ul>{history.map((item, index) => (
            <li key={`${item.exam_id}-${index}`}>
              <div><strong>{item.subject_name || 'Examen'}</strong><span>G{item.group} · {formatExamType(item.exam_type)}</span></div>
              <p>{[item.academic_term, item.date, item.room_name].filter(Boolean).join(' · ')}</p>
              {item.reason && <p>{item.reason}</p>}
            </li>
          ))}</ul>
        )}
      </section>
    </section>
  );
}
