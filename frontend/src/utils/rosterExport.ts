import type { ProcessedRoster, RosterStudent } from '../types/processedRoster';

/**
 * Calculates standard CRC32 checksum for ZIP archiving.
 */
function crc32(buffer: Uint8Array): number {
  let crc = -1;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/**
 * Creates an uncompressed ZIP archive (STORE mode) from a list of virtual files.
 */
function createUncompressedZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = entry.data;
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    // Local file header (30 bytes + name length)
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true); // signature
    localView.setUint16(4, 20, true);         // version needed (2.0)
    localView.setUint16(6, 0, true);          // flags
    localView.setUint16(8, 0, true);          // compression (0 = stored)
    localView.setUint16(10, 0, true);         // mod time
    localView.setUint16(12, 0, true);         // mod date
    localView.setUint32(14, crc, true);       // crc32
    localView.setUint32(18, size, true);      // compressed size
    localView.setUint32(22, size, true);      // uncompressed size
    localView.setUint16(26, nameBytes.length, true); // file name length
    localView.setUint16(28, 0, true);         // extra field length
    local.set(nameBytes, 30);

    localChunks.push(local, dataBytes);

    // Central directory header (46 bytes + name length)
    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true); // signature
    centralView.setUint16(4, 20, true);         // version made by
    centralView.setUint16(6, 20, true);         // version needed
    centralView.setUint16(8, 0, true);          // flags
    centralView.setUint16(10, 0, true);         // compression
    centralView.setUint16(12, 0, true);         // mod time
    centralView.setUint16(14, 0, true);         // mod date
    centralView.setUint32(16, crc, true);       // crc32
    centralView.setUint32(20, size, true);      // compressed size
    centralView.setUint32(24, size, true);      // uncompressed size
    centralView.setUint16(28, nameBytes.length, true); // file name length
    centralView.setUint16(30, 0, true);         // extra length
    centralView.setUint16(32, 0, true);         // comment length
    centralView.setUint16(34, 0, true);         // disk start
    centralView.setUint16(36, 0, true);         // internal attrs
    centralView.setUint32(38, 0, true);         // external attrs
    centralView.setUint32(42, offset, true);    // relative offset of local header
    central.set(nameBytes, 46);

    centralChunks.push(central);
    offset += local.length + dataBytes.length;
  }

  const centralOffset = offset;
  let centralSize = 0;
  for (const c of centralChunks) centralSize += c.length;

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // signature
  eocdView.setUint16(4, 0, true);          // disk number
  eocdView.setUint16(6, 0, true);          // central dir start disk
  eocdView.setUint16(8, entries.length, true);  // total entries on this disk
  eocdView.setUint16(10, entries.length, true); // total entries
  eocdView.setUint32(12, centralSize, true);    // size of central directory
  eocdView.setUint32(16, centralOffset, true); // offset of central directory
  eocdView.setUint16(20, 0, true);         // comment length

  // Combine all buffers
  const totalLength = offset + centralSize + 22;
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of localChunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  for (const chunk of centralChunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  result.set(eocd, pos);

  return result;
}

/**
 * Escapes characters for XML attributes and text nodes.
 */
function escapeXml(unsafe: string): string {
  return (unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function getSafeFilenameBase(metadata: ProcessedRoster): string {
  const sigla = (metadata.subject_code || metadata.subjectCode || 'Materia').replace(/[^a-zA-Z0-9_-]/g, '_');
  const grupo = (metadata.group_code || metadata.groupCode || 'G').replace(/[^a-zA-Z0-9_-]/g, '_');
  const gestion = (metadata.academic_term || metadata.academicTerm || 'periodo').replace(/[\/\\]/g, '-').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `nomina_${sigla}_G${grupo}_${gestion}`;
}

/**
 * Exports roster students and metadata into a CSV format with UTF-8 BOM.
 */
export function downloadRosterCsv(metadata: ProcessedRoster, students: RosterStudent[]): void {
  const teacher = metadata.teacher_name || metadata.teacherName || '';
  const subjectCode = metadata.subject_code || metadata.subjectCode || '';
  const subjectName = metadata.subject_name || metadata.subjectName || '';
  const group = metadata.group_code || metadata.groupCode || '';
  const term = metadata.academic_term || metadata.academicTerm || '';

  const lines: string[] = [
    `Docente: ${teacher}`,
    `Materia: ${subjectCode} - ${subjectName}`,
    `Grupo: ${group}`,
    `Gestion: ${term}`,
    '',
    'Codigo SIS,CI,Nombre Completo,Estado,Motivo Inhabilitacion',
  ];

  for (const s of students) {
    const sis = (s.studentKey || '').replace(/,/g, '');
    const ci = (s.ci || '').replace(/,/g, '');
    const name = `"${(s.fullName || '').replace(/"/g, '""')}"`;
    const status = s.status || 'HABILITADO';
    const reason = s.ineligibilityReason ? `"${s.ineligibilityReason.replace(/"/g, '""')}"` : '';
    lines.push(`${sis},${ci},${name},${status},${reason}`);
  }

  // Prepend UTF-8 BOM (\uFEFF) so Excel respects special characters and accents
  const bom = '\uFEFF';
  const csvContent = bom + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerBrowserDownload(blob, `${getSafeFilenameBase(metadata)}.csv`);
}

/**
 * Exports roster students and metadata into a genuine OpenXML .xlsx spreadsheet.
 */
export function downloadRosterXlsx(metadata: ProcessedRoster, students: RosterStudent[]): void {
  const encoder = new TextEncoder();
  const teacher = metadata.teacher_name || metadata.teacherName || '';
  const subjectCode = metadata.subject_code || metadata.subjectCode || '';
  const subjectName = metadata.subject_name || metadata.subjectName || '';
  const group = metadata.group_code || metadata.groupCode || '';
  const term = metadata.academic_term || metadata.academicTerm || '';

  const rowsXml: string[] = [];
  let rowIdx = 1;

  const addRow = (cells: string[]) => {
    const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
    const cXml = cells.map((val, idx) => {
      const col = cols[idx] || 'A';
      return `<c r="${col}${rowIdx}" t="inlineStr"><is><t>${escapeXml(val)}</t></is></c>`;
    }).join('');
    rowsXml.push(`<row r="${rowIdx}">${cXml}</row>`);
    rowIdx++;
  };

  // Metadata headers
  addRow([`Docente: ${teacher}`]);
  addRow([`Materia: ${subjectCode} - ${subjectName}`]);
  addRow([`Grupo: ${group}`]);
  addRow([`Gestión: ${term}`]);
  addRow([]); // Empty separator row

  // Table columns
  addRow(['Código SIS', 'CI', 'Nombre Completo', 'Estado', 'Motivo Inhabilitación']);

  // Student rows
  for (const s of students) {
    addRow([
      s.studentKey || '',
      s.ci || '',
      s.fullName || '',
      s.status || 'HABILITADO',
      s.ineligibilityReason || '',
    ]);
  }

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Nomina" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="16" customWidth="1"/>
    <col min="2" max="2" width="14" customWidth="1"/>
    <col min="3" max="3" width="36" customWidth="1"/>
    <col min="4" max="4" width="16" customWidth="1"/>
    <col min="5" max="5" width="40" customWidth="1"/>
  </cols>
  <sheetData>
    ${rowsXml.join('')}
  </sheetData>
</worksheet>`;

  const zipBytes = createUncompressedZip([
    { name: '[Content_Types].xml', data: encoder.encode(contentTypesXml) },
    { name: '_rels/.rels', data: encoder.encode(relsXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(workbookRelsXml) },
    { name: 'xl/workbook.xml', data: encoder.encode(workbookXml) },
    { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(sheet1Xml) },
  ]);

  const blob = new Blob([zipBytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerBrowserDownload(blob, `${getSafeFilenameBase(metadata)}.xlsx`);
}

