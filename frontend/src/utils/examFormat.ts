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
