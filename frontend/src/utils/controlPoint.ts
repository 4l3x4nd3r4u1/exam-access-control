import type { ControlPointRoom } from '../types/controlPoint';

export function canUseControlPoint(room: ControlPointRoom, userId: number): boolean {
  return room.can_interact === true && Number(room.assistant_id) === userId;
}
