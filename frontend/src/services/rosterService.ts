import { API_BASE_URL } from './apiClient';
import { getStoredSession } from './sessionStorage';
import type { FailedRosterRow, ImportRosterApiResponse, ImportRosterSummary, RosterMetadata } from '../types/roster';

function authenticatedHeaders(): Headers {
  const headers = new Headers({ Accept: 'application/json' });
  const token = getStoredSession()?.token;

  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

async function responseError(response: Response): Promise<Error> {
  try {
    const data = await response.json() as { message?: string };
    return new Error(data.message ?? 'No se pudo completar la solicitud.');
  } catch {
    return new Error('No se pudo completar la solicitud.');
  }
}

export const rosterService = {
  async importRoster(file: File): Promise<{ summary: ImportRosterSummary; message: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/students/import`, {
      method: 'POST',
      headers: authenticatedHeaders(),
      body: formData,
    });

    const payload = await response.json() as ImportRosterApiResponse;

    // El backend devuelve el resumen también con 422 cuando el archivo tiene
    // problemas de formato. Ese resumen permite mostrar la plantilla o las filas a corregir.
    if (payload.data) {
      return { summary: payload.data, message: payload.message ?? '' };
    }

    if (!response.ok) throw new Error(payload.message ?? 'No se pudo procesar la planilla.');
    throw new Error('El servidor no devolvió un resumen de la importación.');
  },

  async downloadTemplate(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/courses/roster-template`, {
      headers: authenticatedHeaders(),
    });
    if (!response.ok) throw await responseError(response);

    downloadBlob(await response.blob(), 'plantilla_nomina_estudiantes.csv');
  },

  downloadFailedRows(metadata: RosterMetadata | null, failedRows: FailedRosterRow[]): void {
    const rows = buildCorrectionCsv(metadata, failedRows);
    downloadBlob(new Blob([rows], { type: 'text/csv;charset=utf-8' }), 'filas_por_corregir.csv');
  },
};

function buildCorrectionCsv(metadata: RosterMetadata | null, failedRows: FailedRosterRow[]): string {
  const headers = ['Codigo SIS', 'CI', 'Nombre Completo'];
  const lines: string[][] = [];

  if (metadata) {
    lines.push(
      [`Docente: ${metadata.teacherName}`],
      [`Email Docente: ${metadata.teacherEmail}`],
      [`Materia: ${metadata.subjectCode} - ${metadata.subjectName}`],
      [`Grupo: ${metadata.groupCode}`],
      [`Gestion: ${metadata.academicTerm}`],
      [],
    );
  }

  lines.push(headers);
  failedRows.forEach(({ data }) => {
    lines.push([data.codigo_sis ?? '', data.ci ?? '', data.nombre_completo ?? '']);
  });

  return `\uFEFF${lines.map((line) => line.map(escapeCsv).join(',')).join('\r\n')}\r\n`;
}

function escapeCsv(value: string): string {
  const normalized = String(value);
  return /[",\r\n]/.test(normalized) ? `"${normalized.replaceAll('"', '""')}"` : normalized;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
