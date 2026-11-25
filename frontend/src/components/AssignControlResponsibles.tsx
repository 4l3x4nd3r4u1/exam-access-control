import './controlAssignment.css';
import { useEffect, useState } from 'react';
import { apiRequest } from '../services/apiClient';
import { controlPointRotationService } from '../services/controlPointRotationService';
import type { ControlExam } from '../types/examAccess';
import type { ControlPoint } from '../types/controlPointRotation';

interface Staff {
  user_id: number;
  full_name: string;
  email: string;
  roles: string[];
  is_active: boolean;
}

export function AssignControlResponsibles({ exam, currentUserId, onBack }: { exam: ControlExam; currentUserId: number; onBack: () => void }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [points, setPoints] = useState<ControlPoint[]>([]);
  const [unavailable, setUnavailable] = useState<number[]>([]);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    let mounted = true;
    Promise.all([
      apiRequest<{ data: Staff[] }>('/academic-staff'),
      controlPointRotationService.getControlPoints(exam.exam_id),
    ]).then(([users, response]) => {
      if (!mounted) return;
      setStaff(users.data.filter((user) => user.is_active && (Number(user.user_id) === Number(currentUserId) || user.roles.includes('AUXILIAR'))).sort((a, b) => Number(Number(b.user_id) === Number(currentUserId)) - Number(Number(a.user_id) === Number(currentUserId))));
      setPoints(response.control_points);
      setUnavailable(response.unavailable_auxiliary_ids ?? []);
    }).catch((err: unknown) => {
      if (mounted) setError(err instanceof Error ? err.message : 'No se pudieron cargar los responsables.');
    }).finally(() => { if (mounted) setBusy(false); });
    return () => { mounted = false; };
  }, [exam.exam_id, currentUserId]);
  const assigned = new Set(points.filter((point) => point.is_active).flatMap((point) => point.responsibles.map((user) => Number(user.user_id))));
  const roleLabel = (id: number) => Number(id) === Number(currentUserId) ? 'Docente titular (Tú)' : 'Auxiliar';
  const responsibleIds = new Set(staff.map((user) => Number(user.user_id)));
  const missingRooms = exam.rooms.filter((room) => {
    const roomId = Number(room.room_id);
    const hasAssigned = points.some((point) => point.is_active && Number(point.room_id) === roomId && point.responsibles.some((user) => responsibleIds.has(Number(user.user_id))));
    const hasPending = Object.entries(selected).some(([id, target]) => target === roomId && responsibleIds.has(Number(id)) && !assigned.has(Number(id)) && !unavailable.includes(Number(id)));
    return !hasAssigned && !hasPending;
  });
  async function save() {
    if (missingRooms.length > 0) {
      setError('Debes asignar al menos un responsable a cada aula antes de guardar.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const assignments = exam.rooms.map((room) => ({ room_id: Number(room.room_id), user_ids: Object.entries(selected).filter(([, roomId]) => roomId === Number(room.room_id)).map(([id]) => Number(id)) })).filter((room) => room.user_ids.length > 0);
      const result = await controlPointRotationService.assignResponsibles(exam.exam_id, assignments);
      setMessage(result.message);
      setSelected({});
      const response = await controlPointRotationService.getControlPoints(exam.exam_id);
      setPoints(response.control_points);
      setUnavailable(response.unavailable_auxiliary_ids ?? []);
    } catch (err: unknown) {
      try {
        const response = await controlPointRotationService.getControlPoints(exam.exam_id);
        setUnavailable(response.unavailable_auxiliary_ids ?? []);
        setPoints(response.control_points);
        setSelected((previous) => Object.fromEntries(Object.entries(previous).filter(([id]) => !(response.unavailable_auxiliary_ids ?? []).includes(Number(id)))));
      } catch { setMessage(''); }
      setError(err instanceof Error ? err.message : 'No se pudieron asignar los responsables.');
    } finally { setBusy(false); }
  }
  const availableStaff = staff.filter((user) =>
    !assigned.has(user.user_id) &&
    `${user.full_name} ${user.email} ${roleLabel(user.user_id)}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="cg-drawer ec-assignment-drawer">
      <h2>Asignar responsables</h2>
      <p className="ec-assignment-subject">{exam.subject_name} · G{exam.group}</p>
      <div className="ec-assignment-scroll">
        <div className="cg-count">
          <span>Aulas</span><strong>{exam.rooms.length}</strong>
        </div>
        {exam.rooms.map((room) => {
          const responsibles = points
            .filter((point) => point.room_id === Number(room.room_id))
            .flatMap((point) => point.responsibles.map((user) => ({
              ...user,
              controlType: point.control_type,
            })));
          const pending = staff.filter((user) => selected[user.user_id] === Number(room.room_id));
          return (
            <section key={room.room_id} className="ec-assignment-room">
              <div className="ec-assignment-room-title">
                <strong>{room.room_name}</strong>
                <span>{responsibles.length} asignados{pending.length > 0 ? ` · ${pending.length} por guardar` : ''}</span>
              </div>
              {responsibles.map((user) => (
                <div className="ec-assignment-person" key={`${user.user_id}-${user.controlType}`}>
                  <span>{staff.find((item) => item.user_id === user.user_id)?.full_name ?? user.name ?? 'Responsable'} <small>· {roleLabel(user.user_id)}</small></span>
                  <small>{user.controlType === 'ENTRY' ? 'Ingreso' : 'Durante el examen'}</small>
                </div>
              ))}
              {pending.map((user) => (
                <div className="ec-assignment-person" key={user.user_id}>
                  <span>{user.full_name} <small>· {roleLabel(user.user_id)}</small></span><small>Por guardar</small>
                </div>
              ))}
              {!busy && responsibles.length === 0 && pending.length === 0 && (
                <p className="ec-assignment-empty">Sin responsables asignados</p>
              )}
            </section>
          );
        })}
        <div className="cg-count"><span>Responsables disponibles</span><strong>{availableStaff.filter((user) => !unavailable.includes(user.user_id)).length}</strong></div>
        <label className="cg-search">
          <input type="search" placeholder="Buscar responsable" aria-label="Buscar responsable" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        {availableStaff.map((user) => (
          <label className="ec-assignment-staff" key={user.user_id}>
            <span>{user.full_name} <small>· {roleLabel(user.user_id)}</small>{unavailable.includes(user.user_id) && <small> · No disponible en este horario</small>}</span>
            <select aria-label={`Aula de ${user.full_name}`} disabled={busy || unavailable.includes(user.user_id)} value={selected[user.user_id] ?? 0} onChange={(event) => {
              const roomId = Number(event.target.value);
              setSelected((previous) => {
                const next = { ...previous };
                if (roomId) next[user.user_id] = roomId;
                else delete next[user.user_id];
                return next;
              });
            }}>
              <option value={0}>Sin asignar</option>
              {exam.rooms.map((room) => <option key={room.room_id} value={room.room_id}>{room.room_name}</option>)}
            </select>
          </label>
        ))}
        {!busy && availableStaff.length === 0 && <p className="ec-assignment-empty">No se encontraron responsables.</p>}
        {!busy && missingRooms.length > 0 && (
          <p role="status" className="cg-feedback cg-error">Asigna al menos un responsable a cada aula. Faltan: {missingRooms.map((room) => room.room_name).join(', ')}.</p>
        )}
        {busy && <p className="cg-feedback">Cargando...</p>}
        {error && <p role="alert" className="cg-feedback cg-error">{error}</p>}
        {message && <p role="status" className="cg-feedback">{message}</p>}
      </div>
      <div className="ec-assignment-actions">
        <button type="button" className="cg-cancel ec-assignment-back" disabled={busy} onClick={onBack}>Volver</button>
        <button type="button" className="cg-cancel" disabled={busy || missingRooms.length > 0 || Object.keys(selected).length === 0} onClick={() => void save()}>Guardar asignaciones{Object.keys(selected).length > 0 ? ` (${Object.keys(selected).length})` : ''}</button>
      </div>
    </div>
  );
}