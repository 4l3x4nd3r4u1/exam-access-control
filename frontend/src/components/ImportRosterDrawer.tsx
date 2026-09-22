import { useRef, useState } from 'react';
import importRosterIcon from '../assets/importar_planilla.svg';
import { rosterService } from '../services/rosterService';
import type { ImportRosterSummary } from '../types/roster';
import { BottomDrawer } from './BottomDrawer';

interface ImportRosterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportRosterDrawer({ isOpen, onClose }: ImportRosterDrawerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<ImportRosterSummary | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setSummary(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const close = () => {
    if (isImporting || isDownloading) return;
    reset();
    onClose();
  };

  const selectFile = () => fileInputRef.current?.click();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setSummary(null);
    setError(null);
  };

  const importFile = async () => {
    if (!file) return;
    setError(null);
    setIsImporting(true);
    try {
      const result = await rosterService.importRoster(file);
      setSummary(result.summary);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo procesar la planilla.');
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = async () => {
    setError(null);
    setIsDownloading(true);
    try {
      await rosterService.downloadTemplate();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo descargar la plantilla.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <BottomDrawer isOpen={isOpen} onClose={close} ariaLabel="Importar padrón de estudiantes">
      <section className="import-roster-drawer-content">
        <input ref={fileInputRef} className="visually-hidden" type="file" accept=".csv,.xlsx,.xls,text/csv" onChange={handleFileChange} />

        {!summary ? (
          <>
            <img src={importRosterIcon} alt="" className="import-roster-drawer-icon" />
            <h2>Importar padrón<br />de estudiantes</h2>
            <p className="import-roster-description">Carga la planilla en formato CSV o Excel para registrar a los estudiantes.</p>

            {file ? (
              <div className="import-roster-file-action">
                <div className="import-roster-file-name">
                  <span title={file.name}>{file.name}</span>
                  {!isImporting && <button type="button" onClick={reset} aria-label="Quitar archivo">×</button>}
                </div>
                <button type="button" className="import-roster-submit" onClick={importFile} disabled={isImporting}>
                  {isImporting ? <span className="import-roster-spinner" aria-label="Procesando" /> : 'Importar archivo'}
                </button>
              </div>
            ) : (
              <button type="button" className="import-roster-select" onClick={selectFile}>Seleccionar archivo</button>
            )}
          </>
        ) : (
          <ImportResult
            summary={summary}
            onDownloadCorrections={() => rosterService.downloadFailedRows(summary.metadata, summary.failedRows)}
            onDownloadTemplate={downloadTemplate}
            onReset={reset}
            onDone={close}
            isDownloading={isDownloading}
          />
        )}

        {error && <p className="import-roster-error" role="alert">{error}</p>}
      </section>
    </BottomDrawer>
  );
}

interface ImportResultProps {
  summary: ImportRosterSummary;
  onDownloadCorrections: () => void;
  onDownloadTemplate: () => void;
  onReset: () => void;
  onDone: () => void;
  isDownloading: boolean;
}

function ImportResult({ summary, onDownloadCorrections, onDownloadTemplate, onReset, onDone, isDownloading }: ImportResultProps) {
  const hasFailedRows = summary.failedRows.length > 0;
  const isCompleteSuccess = summary.isSuccessful && !hasFailedRows;
  const isMissingMetadata = summary.observations.some((observation) => /metadatos/i.test(observation));
  const isMissingColumns = summary.observations.some((observation) => /cabecera|columnas/i.test(observation));
  const needsTemplate = !summary.isSuccessful && !hasFailedRows && (isMissingMetadata || isMissingColumns);
  const issueSummary = summarizeFailedRows(summary);
  const heading = isCompleteSuccess
    ? 'Planilla importada correctamente'
    : hasFailedRows
      ? 'Planilla procesada con observaciones'
      : isMissingMetadata
        ? 'Faltan metadatos requeridos'
        : isMissingColumns
          ? 'Faltan columnas obligatorias'
          : 'No se pudo procesar la planilla';
  const description = isCompleteSuccess
      ? `${summary.successful} ${summary.successful === 1 ? 'estudiante fue registrado' : 'estudiantes fueron registrados'} correctamente.`
    : hasFailedRows
      ? 'Algunas filas no se pudieron registrar. Descárgalas para corregirlas y volver a subirlas.'
      : needsTemplate
        ? 'Usa la plantilla oficial para completar la información requerida y vuelve a subirla.'
        : 'Revisa las observaciones e intenta nuevamente.';

  return (
    <div className={`import-roster-result${isCompleteSuccess ? ' import-roster-result-success' : ' import-roster-result-warning'}`}>
      <ImportStatusIcon success={isCompleteSuccess} />
      <h2>{heading}</h2>
      <p className="import-roster-result-description">{description}</p>

      {!isCompleteSuccess && (
        <div className="import-roster-statistics">
          <span><strong>{summary.successful}</strong> registrados</span>
          <span><strong>{summary.skipped}</strong> omitidos</span>
        </div>
      )}

      {hasFailedRows && (
        <>
          <div className="import-roster-failure-summary">
            <span>Resumen de omisiones</span>
            <ul>
              {issueSummary.map(({ reason, rows }) => (
                <li key={reason}>
                  <span>{reason}</span>
                  <small>{rows.length === 1 ? `Fila ${rows[0]}` : `Filas ${rows.join(', ')}`}</small>
                </li>
              ))}
            </ul>
          </div>
          <button type="button" className="import-roster-submit" onClick={onDownloadCorrections}>Descargar filas a corregir</button>
        </>
      )}

      {!hasFailedRows && summary.observations.length > 0 && (
        <ul className="import-roster-observations">
          {summary.observations.map((observation) => <li key={observation}>{observation}</li>)}
        </ul>
      )}

      {needsTemplate && (
        <button type="button" className="import-roster-outline-button" onClick={onDownloadTemplate} disabled={isDownloading}>
          {isDownloading ? 'Descargando plantilla...' : 'Descargar plantilla oficial'}
        </button>
      )}
      {isCompleteSuccess ? (
        <button type="button" className="import-roster-done-button" onClick={onDone}>Listo</button>
      ) : (
        <button type="button" className="import-roster-another-file" onClick={onReset}>Subir otra planilla</button>
      )}
    </div>
  );
}

function summarizeFailedRows(summary: ImportRosterSummary): Array<{ reason: string; rows: number[] }> {
  const grouped = new Map<string, number[]>();

  summary.failedRows.forEach(({ reason, rowNumber }) => {
    grouped.set(reason, [...(grouped.get(reason) ?? []), rowNumber]);
  });

  return [...grouped].map(([reason, rows]) => ({ reason, rows }));
}

function ImportStatusIcon({ success }: { success: boolean }) {
  return (
    <svg className={`import-roster-status-icon${success ? ' is-success' : ' is-warning'}`} viewBox="0 0 72 72" aria-hidden="true">
      <path d="M36 4.5c4.5 0 8.5 4.1 12.6 5.7 4.2 1.7 9.8 1.1 12.8 4.1s2.4 8.6 4.1 12.8C67.1 31.2 71.5 31.5 71.5 36s-4.4 4.8-6 8.9c-1.7 4.2-1.1 9.8-4.1 12.8s-8.6 2.4-12.8 4.1C44.5 63.4 40.5 67.5 36 67.5s-8.5-4.1-12.6-5.7c-4.2-1.7-9.8-1.1-12.8-4.1s-2.4-8.6-4.1-12.8C4.9 40.8.5 40.5.5 36s4.4-4.8 6-8.9c1.7-4.2 1.1-9.8 4.1-12.8s8.6-2.4 12.8-4.1C27.5 8.6 31.5 4.5 36 4.5Z" />
      {success ? <path className="import-roster-status-mark" d="m22.5 36.8 8.2 8.1 18.8-19" /> : <path className="import-roster-status-mark" d="M36 20v20M36 51.5v.2" />}
    </svg>
  );
}
