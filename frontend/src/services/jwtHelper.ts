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
  DOCENTE: 'Docente',
  AUXILIAR: 'Auxiliar',
  ESTUDIANTE: 'Estudiante',
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
  return roleLabelsMap[normalizedKey] ?? role;
}
