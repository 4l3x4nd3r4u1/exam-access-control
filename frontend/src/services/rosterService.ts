import type { ImportRosterResponse, ImportSummaryData } from '../types/roster';
import { API_BASE_URL, getAuthToken } from './apiClient';

interface ParsedCourseRoster {
  courseGroupId: string;
  subjectCode: string;
  subjectName: string;
  groupCode: string;
  academicTerm: string;
  teacherName: string;
  totalStudents: number;
  students: Array<{ sis: string; ci: string; fullName: string }>;
}

function parseCsvRow(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === separator && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''));
  return result;
}

function parseRosterCsv(csvText: string): ParsedCourseRoster[] {
  const cleanCsvText = csvText.replace(/^\uFEFF/, '').trim();
  const lines = cleanCsvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const separator = lines[0].includes(';') ? ';' : ',';
  const header = parseCsvRow(lines[0], separator).map((h) =>
    h
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
  );

  const sisIdx = header.findIndex((h) => h.includes('sis'));
  const ciIdx = header.findIndex((h) => h === 'ci' || h.includes('ci'));
  const nameIdx = header.findIndex((h) => h.includes('nombre'));
  const codeIdx = header.findIndex((h) => h.includes('sigla') || h.includes('cod_mat') || h.includes('codigo_mat'));
  const subjectIdx = header.findIndex((h) => h.includes('materia') && !h.includes('sigla') && !h.includes('cod'));
  const groupIdx = header.findIndex((h) => h.includes('grupo') || h.includes('paralelo'));
  const termIdx = header.findIndex((h) => h.includes('gestion') || h.includes('periodo'));
  const emailIdx = header.findIndex((h) => h.includes('email') || h.includes('docente'));

  if (sisIdx === -1 || codeIdx === -1 || groupIdx === -1 || termIdx === -1) {
    return [];
  }

  const courseMap = new Map<string, ParsedCourseRoster>();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvRow(lines[i], separator);
    if (cols.length <= Math.max(sisIdx, codeIdx, groupIdx, termIdx)) continue;

    const subjectCode = (cols[codeIdx] || 'INF110').toUpperCase().trim();
    const rawGroup = (cols[groupIdx] || '1').trim();
    const cleanGroup = rawGroup.toUpperCase().replace(/^G+/, '') || '1';
    const academicTerm = (cols[termIdx] || '2/2026').trim();
    const subjectName = (subjectIdx !== -1 && cols[subjectIdx] ? cols[subjectIdx].trim() : '') || subjectCode;
    const teacherName = (emailIdx !== -1 && cols[emailIdx] ? cols[emailIdx].trim() : '') || 'Docente Titular';

    const courseGroupId = `${subjectCode}-G${cleanGroup}-${academicTerm}`;

    if (!courseMap.has(courseGroupId)) {
      courseMap.set(courseGroupId, {
        courseGroupId,
        subjectCode,
        subjectName,
        groupCode: cleanGroup,
        academicTerm,
        teacherName,
        totalStudents: 0,
        students: [],
      });
    }

    const course = courseMap.get(courseGroupId)!;
    course.students.push({
      sis: cols[sisIdx] || '',
      ci: ciIdx !== -1 ? cols[ciIdx] : '',
      fullName: nameIdx !== -1 ? cols[nameIdx] : '',
    });
    course.totalStudents = course.students.length;
  }

  return Array.from(courseMap.values());
}

function saveLocalRosters(parsedList: ParsedCourseRoster[]) {
  try {
    const rostersRaw = localStorage.getItem('eac_imported_rosters');
    const rosters: any[] = rostersRaw ? JSON.parse(rostersRaw) : [];

    const studentsRaw = localStorage.getItem('eac_students_data');
    const studentsMap: Record<string, any[]> = studentsRaw ? JSON.parse(studentsRaw) : {};

    for (const parsed of parsedList) {
      const existingIdx = rosters.findIndex((r) => r.courseGroupId === parsed.courseGroupId);
      const newEntry = {
        courseGroupId: parsed.courseGroupId,
        subjectCode: parsed.subjectCode,
        subjectName: parsed.subjectName,
        groupCode: parsed.groupCode,
        academicTerm: parsed.academicTerm,
        teacherName: parsed.teacherName,
        totalEnrolled: parsed.totalStudents,
        updatedAt: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        rosters[existingIdx] = newEntry;
      } else {
        rosters.unshift(newEntry);
      }

      studentsMap[parsed.courseGroupId] = parsed.students.map((s) => ({
        studentKey: s.sis,
        ci: s.ci,
        fullName: s.fullName,
        status: 'Habilitado',
      }));
    }

    localStorage.setItem('eac_imported_rosters', JSON.stringify(rosters));
    localStorage.setItem('eac_students_data', JSON.stringify(studentsMap));
  } catch (e) {
    console.warn('Error guardando planilla en almacenamiento local:', e);
  }
}

export const rosterService = {
  async importRoster(file: File, token?: string): Promise<ImportSummaryData> {
    const formData = new FormData();
    formData.append('file', file);

    const authToken = token || getAuthToken();
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    try {
      const text = await file.text();
      const parsed = parseRosterCsv(text);
      if (parsed && parsed.length > 0) {
        saveLocalRosters(parsed);
      }
    } catch (e) {
      console.warn('No se pudo procesar copia local de planilla:', e);
    }

    const response = await fetch(`${API_BASE_URL}/students/import`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const json: ImportRosterResponse = await response.json();

    if (!response.ok || !json.data) {
      const errorDetail = json.data?.observations && json.data.observations.length > 0
        ? json.data.observations.join(' | ')
        : (json.message || 'Error al procesar la planilla');
      throw new Error(errorDetail);
    }

    return json.data;
  },
};
