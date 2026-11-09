import type { AvailableRoom } from '../types/exam';

export interface RoomSuggestionResult {
  suggestedRooms: AvailableRoom[];
  suggestedRoomIds: string[];
  totalSuggestedCapacity: number;
  requiredCapacity: number;
  isExactMatch: boolean;
  hasSufficientCapacity: boolean;
  wastedCapacity: number;
}

/**
 * Sugiere de manera automática las aulas más eficientes según la capacidad requerida.
 *
 * Criterios de eficiencia:
 * 1. Capacidad suficiente: Suma de capacidades >= capacidad requerida (o todas las aulas si la capacidad total es insuficiente).
 * 2. Mínimo número de aulas: Prioriza 1 aula antes que 2, 2 antes que 3 (simplifica supervisión y control en puerta).
 * 3. Mínimo desperdicio de plazas: Entre combinaciones con el mismo número de aulas, elige la de menor exceso de plazas.
 */
export function suggestOptimalRooms(
  rooms: AvailableRoom[],
  requiredCapacity: number,
): RoomSuggestionResult {
  const target = Math.max(0, requiredCapacity);

  if (!rooms || rooms.length === 0 || target === 0) {
    return {
      suggestedRooms: [],
      suggestedRoomIds: [],
      totalSuggestedCapacity: 0,
      requiredCapacity: target,
      isExactMatch: target === 0,
      hasSufficientCapacity: true,
      wastedCapacity: 0,
    };
  }

  // Capacidad total de todas las aulas disponibles
  const totalAvailable = rooms.reduce((sum, r) => sum + r.capacity, 0);

  // Si todas las aulas juntas no alcanzan, se sugieren todas las aulas disponibles
  if (totalAvailable < target) {
    return {
      suggestedRooms: [...rooms],
      suggestedRoomIds: rooms.map((r) => String(r.room_id)),
      totalSuggestedCapacity: totalAvailable,
      requiredCapacity: target,
      isExactMatch: false,
      hasSufficientCapacity: false,
      wastedCapacity: 0,
    };
  }

  // Ordenar aulas por capacidad ascendente
  const sorted = [...rooms].sort((a, b) => a.capacity - b.capacity);
  const n = sorted.length;

  // Buscar la menor cantidad de aulas k (1, 2, ..., n) que cubra el requerimiento
  for (let k = 1; k <= n; k++) {
    let bestCombo: AvailableRoom[] | null = null;
    let bestSum = Number.POSITIVE_INFINITY;

    function findCombos(
      startIndex: number,
      currentCombo: AvailableRoom[],
      currentSum: number,
    ) {
      if (currentCombo.length === k) {
        if (currentSum >= target && currentSum < bestSum) {
          bestCombo = [...currentCombo];
          bestSum = currentSum;
        }
        return;
      }

      for (let i = startIndex; i < n; i++) {
        const nextSum = currentSum + sorted[i].capacity;
        if (nextSum >= bestSum) {
          // Poda: si ya supera o iguala la mejor suma encontrada, continuar
          continue;
        }

        currentCombo.push(sorted[i]);
        findCombos(i + 1, currentCombo, nextSum);
        currentCombo.pop();
      }
    }

    findCombos(0, [], 0);

    if (bestCombo !== null) {
      const selected = bestCombo as AvailableRoom[];
      const totalCapacity = selected.reduce((sum, r) => sum + r.capacity, 0);

      return {
        suggestedRooms: selected,
        suggestedRoomIds: selected.map((r) => String(r.room_id)),
        totalSuggestedCapacity: totalCapacity,
        requiredCapacity: target,
        isExactMatch: totalCapacity === target,
        hasSufficientCapacity: totalCapacity >= target,
        wastedCapacity: Math.max(0, totalCapacity - target),
      };
    }
  }

  return {
    suggestedRooms: [...rooms],
    suggestedRoomIds: rooms.map((r) => String(r.room_id)),
    totalSuggestedCapacity: totalAvailable,
    requiredCapacity: target,
    isExactMatch: totalAvailable === target,
    hasSufficientCapacity: totalAvailable >= target,
    wastedCapacity: Math.max(0, totalAvailable - target),
  };
}

/**
 * Distribuye estudiantes de manera equitativa entre un conjunto de aulas,
 * respetando estrictamente la capacidad máxima de cada aula.
 *
 * Si un aula más pequeña no puede albergar la parte proporcional, se llena a su
 * capacidad máxima y los estudiantes restantes se distribuyen equitativamente entre las aulas mayores.
 *
 * @param rooms Lista de aulas disponibles con su capacidad
 * @param totalStudents Número total de estudiantes a distribuir
 * @returns Arreglo con la cantidad de estudiantes asignados a cada aula en el mismo orden de entrada
 */
export function distributeStudentsEqually(
  rooms: { capacity: number }[],
  totalStudents: number,
): number[] {
  const n = rooms.length;
  if (n === 0) {
    return [];
  }
  if (n === 1) {
    return [Math.min(totalStudents, rooms[0].capacity)];
  }

  const totalCap = rooms.reduce((sum, r) => sum + r.capacity, 0);
  const toDistribute = Math.min(totalStudents, totalCap);

  const allocation = new Array(n).fill(0);
  let remaining = toDistribute;
  const activeIndices = new Set(rooms.map((_, i) => i));

  while (remaining > 0 && activeIndices.size > 0) {
    const share = Math.floor(remaining / activeIndices.size);
    const extra = remaining % activeIndices.size;

    let anyCapped = false;
    const sortedActive = Array.from(activeIndices).sort(
      (a, b) => rooms[a].capacity - rooms[b].capacity,
    );

    for (const idx of sortedActive) {
      const roomCap = rooms[idx].capacity;
      const currentAssigned = allocation[idx];
      const maxCanAdd = roomCap - currentAssigned;

      if (maxCanAdd <= share) {
        allocation[idx] = roomCap;
        remaining -= maxCanAdd;
        activeIndices.delete(idx);
        anyCapped = true;
        break;
      }
    }

    if (!anyCapped) {
      let extraLeft = extra;
      for (const idx of sortedActive) {
        const add = share + (extraLeft > 0 ? 1 : 0);
        if (extraLeft > 0) {
          extraLeft--;
        }
        allocation[idx] += add;
        remaining -= add;
        activeIndices.delete(idx);
      }
      break;
    }
  }

  return allocation;
}
