
import { useEffect, useState } from 'react';

import { examReportService } from '../services/examReportService';
import type { ExamReport } from '../services/examReportService';
import type { ControlPointExam } from '../types/controlPoint';
import { formatExamType, formatTime } from '../utils/examFormat';

interface ExamReportsViewProps {
  exam: ControlPointExam;
  onBack: () => void;
  onLogout: () => void;
}

export function ExamReportsView({
  exam,
  onBack,
  onLogout,
}: ExamReportsViewProps) {
  const [reports, setReports] = useState<ExamReport[]>([]);
  const [description, setDescription] = useState('');
  const [reportsLoading, setReportsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    examReportService
      .getReports(exam.exam_id)
      .then((items) => {
        if (isMounted) {
          setReports(items);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudieron consultar los reportes.',
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setReportsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [exam.exam_id]);

  const generateReport = async () => {
    if (!description.trim() || saving) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await examReportService.createReport(
        exam.exam_id,
        description.trim(),
      );

      const items = await examReportService.getReports(exam.exam_id);

      setReports(items);
      setDescription('');
      setMessage('Reporte registrado correctamente.');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo generar el reporte.',
      );
    } finally {
      setSaving(false);
    }
  };

  const downloadReport = async (reportId: number) => {
    setError(null);

    try {
      await examReportService.downloadReport(exam.exam_id, reportId);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo descargar el PDF.',
      );
    }
  };

  return (
    <main className="app-shell cg-screen er-screen">
      <header className="cg-topbar">
        <button
          type="button"
          className="cg-icon-button"
          onClick={onBack}
          aria-label="Volver a los exámenes"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12H4M10 6l-6 6 6 6" />
          </svg>
        </button>

        <button
          type="button"
          className="cg-icon-button"
          onClick={onLogout}
          aria-label="Cerrar sesión"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4.25" />
            <path d="M4.5 21c.85-4 3.3-6 7.5-6s6.65 2 7.5 6" />
          </svg>
        </button>
      </header>

      <h1 className="er-title">Reportes de exámenes</h1>

      <section
        className="er-content"
        aria-label="Reportes del examen"
      >
        <div className="er-exam-detail">
          <h2>{exam.subject_name}</h2>

          <p>
            {formatExamType(exam.exam_type)} — Grupo {exam.group}
          </p>

          <div className="er-detail-line">
            <span>Fecha</span>
            <strong>{exam.date}</strong>
          </div>

          <div className="er-detail-line">
            <span>Horario</span>
            <strong>
              {formatTime(exam.start_time)}
              {' - '}
              {formatTime(exam.end_time)}
            </strong>
          </div>
        </div>

        <div className="er-section">
          <h2>Generar reporte</h2>

          <p className="er-section-description">
            Describe detalladamente el incidente ocurrido
            durante el examen.
          </p>

          <textarea
            className="er-textarea"
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            placeholder="Escribe aquí la descripción del incidente..."
            maxLength={5000}
            rows={8}
            disabled={saving}
            aria-label="Descripción del incidente"
          />

          <p className="er-counter">
            {description.length} / 5000 caracteres
          </p>

          <div className="er-button-container">
            <button
              type="button"
              className="er-primary-button"
              onClick={generateReport}
              disabled={!description.trim() || saving}
            >
              {saving ? 'Generando...' : 'Generar reporte'}
            </button>
          </div>

          {message && (
            <p className="er-success" role="status">
              {message}
            </p>
          )}

          {error && (
            <p className="er-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="er-section">
          <h2>Historial de reportes</h2>

          {reportsLoading ? (
            <p className="er-feedback">
              Cargando reportes...
            </p>
          ) : reports.length === 0 ? (
            <p className="er-empty">
              No hay reportes registrados para este examen.
            </p>
          ) : (
            <div className="er-history">
              {reports.map((report) => (
                <div
                  className="er-history-item"
                  key={report.id}
                >
                  <div>
                    <strong>Reporte de incidencia</strong>
                    <p>{report.descripcion}</p>
                  </div>

                  <button
                    type="button"
                    className="er-download-button"
                    onClick={() =>
                      downloadReport(report.id)
                    }
                  >
                    Descargar PDF
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
