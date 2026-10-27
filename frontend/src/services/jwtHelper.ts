export interface JwtPayload {
  sub: number | string;
  roles?: string[];
  functions?: string[];
  name?: string;
  email?: string;
  ci?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

const roleLabelsMap: Record<string, string> = {
  ADMIN: 'Administrador',
  ADMINISTRADOR: 'Administrador',
  DOCENTE: 'Docente',
  TEACHER: 'Docente',
  AUXILIAR: 'Auxiliar',
  ASSISTANT: 'Auxiliar',
  ESTUDIANTE: 'Estudiante',
  STUDENT: 'Estudiante',
};

export function decodeJwtToken(token: string): JwtPayload | null {
  if (!token || typeof token !== 'string') return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const binaryString = atob(base64);
    const byteNumbers = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
    const jsonPayload = new TextDecoder().decode(byteNumbers);

    return JSON.parse(jsonPayload) as JwtPayload;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

export function formatRoleLabel(role: string): string {
  if (!role) return '';
  const normalizedKey = role.toUpperCase().trim();
  if (roleLabelsMap[normalizedKey]) {
    return roleLabelsMap[normalizedKey];
  }
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}
