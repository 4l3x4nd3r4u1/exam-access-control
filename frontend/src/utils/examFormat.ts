/** "PRIMER PARCIAL" -> "Primer Parcial" */
export function formatExamType(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** "08:00:00" -> "08:00" */
export function formatTime(value: string): string {
  return value ? value.slice(0, 5) : '-';
}


/** "PRIMER PARCIAL" -> "PP", "EXAMEN DE MESA" -> "EM" */
export function abbreviateExamType(value: string): string {
  return value
    .split(/\s+/)
    .filter((word) => word.length > 0 && word.toLowerCase() !== 'de')
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

/** "2026-10-24 15:45:00" -> "15:45" */
export function formatCheckInTime(value: string | null): string {
  if (!value) return '-';
  const match = value.match(/(\d{2}:\d{2})/);
  return match ? match[1] : value;
}
