import { useEffect, useState } from 'react';
import { detailedExamReportService } from '../services/detailedExamReportService';
import type {
  DetailedExamEventType,
  DetailedExamReportDetail,
  FinishedExamItem,
  GeneratedDetailedReport,
} from '../types/detailedExamReport';
import {
  abbreviateExamType,
  formatExamType,
  formatTime,
} from '../utils/examFormat';
import '../styles/detailedExamReport.css';

interface DetailedExamReportViewProps {
  onBack: () => void;
  onLogout: () => void;
}

type EventFilterTab = 'ALL' | 'INGRESO' | 'OBSERVACION' | 'EXPULSION';

const EVENT_TYPE_LABEL: Record<DetailedExamEventType, string> = {
  EXPULSION: 'Expulsión',
  AUTORIZACION: 'Autorización',
  OBSERVACION: 'Observación',
  INCIDENTE: 'Incidente',
  INGRESO: 'Ingreso',
};

function formatDisplayDate(value: string): string {
  if (!value) return '-';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return value;
}

function formatDateTime(value: string): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Topbar({
  onBack,
  onLogout,
  backLabel,
}: {
  onBack: () => void;
  onLogout: () => void;
  backLabel: string;
}) {
  return (
    <header className="der-topbar">
      <button
        type="button"
        className="der-icon-btn"
        onClick={onBack}
        aria-label={backLabel}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 12H4M10 6l-6 6 6 6" />
        </svg>
      </button>

      <button
        type="button"
        className="der-icon-btn"
        onClick={onLogout}
        aria-label="Cerrar sesión"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="4.25" />
          <path d="M4.5 21c.85-4 3.3-6 7.5-6s6.65 2 7.5 6" />
        </svg>
      </button>
    </header>
  );
}

export function DetailedExamReportView({
  onBack,
  onLogout,
}: DetailedExamReportViewProps) {
  // Listado de exámenes finalizados
  const [exams, setExams] = useState<FinishedExamItem[]>([]);
  const [examTypes, setExamTypes] = useState<string[]>([]);
  const [gestiones, setGestiones] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedGestion, setSelectedGestion] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Detalle del examen seleccionado
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailedExamReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EventFilterTab>('ALL');

  // Generación / vista de reporte generado
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedReport, setGeneratedReport] =
    useState<GeneratedDetailedReport | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const fetchExams = async (
    nextSearch = search,
    nextType = selectedType,
    nextGestion = selectedGestion,
  ) => {
    setListLoading(true);
    setListError(null);
    try {
      const result = await detailedExamReportService.getFinishedExams({
        search: nextSearch.trim() || undefined,
        exam_type: nextType || undefined,
        gestion: nextGestion || undefined,
      });
      setExams(result.exams);
      setExamTypes(result.examTypes);
      setGestiones(result.gestiones);
    } catch (err) {
      setListError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los exámenes finalizados.',
      );
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    detailedExamReportService
      .getFinishedExams()
      .then((result) => {
        if (!active) return;
        setExams(result.exams);
        setExamTypes(result.examTypes);
        setGestiones(result.gestiones);
      })
      .catch((err) => {
        if (!active) return;
        setListError(
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar los exámenes finalizados.',
        );
      })
      .finally(() => {
        if (active) setListLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    void fetchExams(value, selectedType, selectedGestion);
  };

  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    void fetchExams(search, value, selectedGestion);
  };

  const handleGestionChange = (value: string) => {
    setSelectedGestion(value);
    void fetchExams(search, selectedType, value);
  };

  const handleSelectExam = async (examId: string) => {
    setSelectedExamId(examId);
    setDetail(null);
    setDetailError(null);
    setGenerateError(null);
    setGeneratedReport(null);
    setActiveTab('ALL');
    setDetailLoading(true);

    try {
      const payload = await detailedExamReportService.getExamDetail(examId);
      setDetail(payload);
    } catch (err) {
      setDetailError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el detalle del examen.',
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedExamId || generating) return;
    setGenerating(true);
    setGenerateError(null);

    try {
      const result = await detailedExamReportService.generateReport(
        selectedExamId,
      );
      setGeneratedReport(result.report);
      setDetail((prev) =>
        prev
          ? { ...prev, generated_reports: result.generated_reports }
          : prev,
      );
    } catch (err) {
      setGenerateError(
        err instanceof Error
          ? err.message
          : 'No se pudo generar el reporte detallado.',
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = async (report: GeneratedDetailedReport) => {
    if (!selectedExamId || downloadingId !== null) return;
    setDownloadingId(report.id);
    setDownloadError(null);

    try {
      await detailedExamReportService.downloadReportPdf(
        selectedExamId,
        report.id,
        report.file_name,
      );
    } catch (err) {
      setDownloadError(
        err instanceof Error
          ? err.message
          : 'No se pudo descargar el reporte PDF.',
      );
    } finally {
      setDownloadingId(null);
    }
  };

  // =========================================================
  // PANTALLA 04: REPORTE GENERADO (DESCARGA E HISTORIAL)
  // =========================================================
  if (selectedExamId && generatedReport && detail) {
    const previousReports = detail.generated_reports.filter(
      (item) => item.id !== generatedReport.id,
    );

    return (
      <main className="app-shell der-screen">
        <Topbar
          onBack={() => setGeneratedReport(null)}
          onLogout={onLogout}
          backLabel="Volver al detalle del examen"
        />

        <button
          type="button"
          className="der-back-link"
          onClick={() => setGeneratedReport(null)}
        >
          <span aria-hidden="true">‹</span> Volver al detalle del examen
        </button>

        <section className="der-heading is-detail">
          <h1>Generar reporte de una materia</h1>
        </section>

        <div className="der-success-banner" role="status">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="m8.5 12.5 2.5 2.5 4.5-5" />
          </svg>
          <span>Reporte completo generado correctamente</span>
        </div>

        <section className="der-doc-card" aria-label="Documento generado">
          <div className="der-doc-header">
            <div className="der-pdf-badge">PDF</div>
            <div className="der-doc-titles">
              <strong>{generatedReport.file_name}</strong>
              <span>
                {formatDateTime(generatedReport.generated_at)} · Generado por:{' '}
                {generatedReport.generated_by}
              </span>
            </div>
          </div>

          <div className="der-doc-divider" />

          <div className="der-checklist">
            <strong>Contenido incluido en el documento:</strong>
            {generatedReport.included_sections.map((sectionText) => (
              <p key={sectionText}>✓ {sectionText}</p>
            ))}
          </div>

          <button
            type="button"
            className="der-primary-btn"
            disabled={downloadingId === generatedReport.id}
            onClick={() => void handleDownloadPdf(generatedReport)}
          >
            {downloadingId === generatedReport.id
              ? 'Descargando PDF...'
              : 'Descargar PDF'}
          </button>

          {downloadError && (
            <p className="der-feedback der-error" role="alert">
              {downloadError}
            </p>
          )}
        </section>

        <h2 className="der-section-title">Historial de reportes del examen</h2>

        {previousReports.length === 0 ? (
          <p className="der-feedback">
            Este es el primer reporte detallado generado para este examen.
          </p>
        ) : (
          <div className="der-history-list">
            {previousReports.map((item) => (
              <article className="der-history-item" key={item.id}>
                <strong>Acta completa · {item.file_name}</strong>
                <p>
                  Generado el {formatDateTime(item.generated_at)} por{' '}
                  {item.generated_by} — Incluye {item.summary.total_entered ?? 0}{' '}
                  ingresos, {item.summary.total_observations ?? 0} observaciones y{' '}
                  {item.summary.total_expulsions ?? 0} expulsiones.
                </p>
                <button
                  type="button"
                  className="der-secondary-btn"
                  disabled={downloadingId === item.id}
                  onClick={() => void handleDownloadPdf(item)}
                >
                  {downloadingId === item.id ? 'Descargando...' : 'Descargar PDF'}
                </button>
              </article>
            ))}
          </div>
        )}
      </main>
    );
  }

  // =========================================================
  // PANTALLA 03: DETALLE DEL EXAMEN Y GENERAR REPORTE
  // =========================================================
  if (selectedExamId) {
    const filteredEvents =
      detail?.events.filter((ev) => {
        if (activeTab === 'ALL') return true;
        if (activeTab === 'OBSERVACION') {
          return (
            ev.category === 'OBSERVACION' || ev.category === 'INCIDENTE'
          );
        }
        return ev.category === activeTab;
      }) ?? [];

    return (
      <main className="app-shell der-screen">
        <Topbar
          onBack={() => {
            setSelectedExamId(null);
            setDetail(null);
            setDetailError(null);
          }}
          onLogout={onLogout}
          backLabel="Volver a exámenes finalizados"
        />

        <section className="der-heading is-detail">
          <h1>Generar reporte de una materia</h1>
        </section>

        {detailLoading && (
          <p className="der-feedback">
            Cargando registros del examen...
          </p>
        )}

        {detailError && (
          <p className="der-feedback der-error" role="alert">
            {detailError}
          </p>
        )}

        {detail && !detailLoading && (
          <>
            <section className="der-detail-card">
              <div className="der-detail-top">
                <h2>{detail.exam.subject_name}</h2>
                <span className="der-finished-pill">
                  <span className="der-status-dot" aria-hidden="true" />
                  Finalizado
                </span>
              </div>

              <p className="der-detail-subtitle">
                {formatExamType(detail.exam.exam_type)} — Grupo {detail.exam.group}
                {detail.exam.academic_term
                  ? ` · Gestión ${detail.exam.academic_term}`
                  : ''}
              </p>

              <div className="der-detail-lines">
                <div className="der-detail-line">
                  <span>Fecha</span>
                  <strong>{formatDisplayDate(detail.exam.date)}</strong>
                </div>
                <div className="der-detail-line">
                  <span>Horario</span>
                  <strong>
                    {formatTime(detail.exam.start_time)} -{' '}
                    {formatTime(detail.exam.end_time)}
                  </strong>
                </div>
                <div className="der-detail-line">
                  <span>Puntos de control</span>
                  <strong>
                    {detail.exam.rooms.length > 0
                      ? detail.exam.rooms
                          .map((room) => room.room_name)
                          .join(', ')
                      : 'Sin aulas asignadas'}
                  </strong>
                </div>
              </div>
            </section>

            <h2 className="der-section-title">Resumen de lo registrado</h2>

            <section className="der-kpi-grid" aria-label="Resumen cuantitativo">
              <div className="der-kpi-card">
                <div className="der-kpi-top">
                  <span className="der-kpi-dot is-green" aria-hidden="true" />
                  <strong>
                    {detail.summary.total_entered} / {detail.summary.total_assigned}
                  </strong>
                </div>
                <span>Ingresos registrados</span>
              </div>

              <div className="der-kpi-card">
                <div className="der-kpi-top">
                  <span className="der-kpi-dot is-amber" aria-hidden="true" />
                  <strong>{detail.summary.total_observations}</strong>
                </div>
                <span>Observaciones</span>
              </div>

              <div className="der-kpi-card">
                <div className="der-kpi-top">
                  <span className="der-kpi-dot is-red" aria-hidden="true" />
                  <strong>{detail.summary.total_expulsions}</strong>
                </div>
                <span>Expulsiones</span>
              </div>

              <div className="der-kpi-card">
                <div className="der-kpi-top">
                  <span className="der-kpi-dot is-blue" aria-hidden="true" />
                  <strong>{detail.summary.total_incidents}</strong>
                </div>
                <span>Reportes incidentes</span>
              </div>
            </section>

            <h2 className="der-section-title">Registros del examen</h2>

            <div className="der-tabs" role="tablist" aria-label="Filtrar eventos">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'ALL'}
                className={`der-tab ${activeTab === 'ALL' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('ALL')}
              >
                Todos ({detail.events.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'INGRESO'}
                className={`der-tab ${activeTab === 'INGRESO' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('INGRESO')}
              >
                Ingresos
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'OBSERVACION'}
                className={`der-tab ${activeTab === 'OBSERVACION' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('OBSERVACION')}
              >
                Obs.
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'EXPULSION'}
                className={`der-tab ${activeTab === 'EXPULSION' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('EXPULSION')}
              >
                Expuls.
              </button>
            </div>

            {filteredEvents.length === 0 ? (
              <p className="der-feedback">
                No se registraron eventos en esta categoría durante el examen.
              </p>
            ) : (
              <div className="der-events-list">
                {filteredEvents.map((ev) => (
                  <article className="der-event-card" key={ev.id}>
                    <div className="der-event-top">
                      <span
                        className={`der-event-pill is-${ev.type.toLowerCase()}`}
                      >
                        <span
                          className="der-event-pill-dot"
                          aria-hidden="true"
                        />
                        {EVENT_TYPE_LABEL[ev.type]}
                      </span>
                      <span className="der-event-where">{ev.subtitle}</span>
                    </div>

                    <strong className="der-event-actor">{ev.title}</strong>
                    <p className="der-event-detail">{ev.detail}</p>
                  </article>
                ))}
              </div>
            )}

            <button
              type="button"
              className="der-primary-btn"
              disabled={generating}
              onClick={() => void handleGenerateReport()}
            >
              {generating
                ? 'Generando reporte...'
                : 'Generar reporte completo (PDF)'}
            </button>

            {generateError && (
              <p className="der-feedback der-error" role="alert">
                {generateError}
              </p>
            )}

            {detail.generated_reports.length > 0 && (
              <>
                <h2 className="der-section-title">
                  Reportes generados previamente
                </h2>
                <div className="der-history-list">
                  {detail.generated_reports.map((rep) => (
                    <article className="der-history-item" key={rep.id}>
                      <strong>{rep.file_name}</strong>
                      <p>
                        {formatDateTime(rep.generated_at)} · Por {rep.generated_by}
                      </p>
                      <button
                        type="button"
                        className="der-secondary-btn"
                        disabled={downloadingId === rep.id}
                        onClick={() => void handleDownloadPdf(rep)}
                      >
                        {downloadingId === rep.id
                          ? 'Descargando...'
                          : 'Descargar PDF'}
                      </button>
                    </article>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    );
  }

  // =========================================================
  // PANTALLA 02: LISTADO DE EXÁMENES FINALIZADOS
  // =========================================================
  return (
    <main className="app-shell der-screen">
      <Topbar
        onBack={onBack}
        onLogout={onLogout}
        backLabel="Volver al panel"
      />

      <section className="der-heading">
        <h1>Reporte de examen</h1>
        <p>Selecciona un examen finalizado</p>
      </section>

      <div className="der-search">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m16 16 5 5" />
        </svg>

        <input
          type="search"
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Buscar materia, grupo o gestión"
          aria-label="Buscar examen finalizado"
        />

        {search && (
          <button
            type="button"
            className="der-clear-btn"
            onClick={() => handleSearchChange('')}
          >
            limpiar
          </button>
        )}
      </div>

      <div className="der-filters">
        <div className="der-filter-cell">
          <select
            className="der-filter-select"
            value={selectedType}
            onChange={(event) => handleTypeChange(event.target.value)}
            aria-label="Filtrar por tipo de examen"
          >
            <option value="">Tipo: Todos</option>
            {examTypes.map((typeItem) => (
              <option key={typeItem} value={typeItem}>
                Tipo: {formatExamType(typeItem)}
              </option>
            ))}
          </select>

          <svg className="der-filter-chevron" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3 4.5L6 7.5L9 4.5" />
          </svg>
        </div>

        <div className="der-filter-cell">
          <select
            className="der-filter-select"
            value={selectedGestion}
            onChange={(event) => handleGestionChange(event.target.value)}
            aria-label="Filtrar por gestión"
          >
            <option value="">Gestión: Todas</option>
            {gestiones.map((term) => (
              <option key={term} value={term}>
                Gestión: {term}
              </option>
            ))}
          </select>

          <svg className="der-filter-chevron" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3 4.5L6 7.5L9 4.5" />
          </svg>
        </div>
      </div>

      <div className="der-list-header">
        <div className="der-list-header-left">
          <strong>Exámenes finalizados</strong>
          <span className="der-count-badge">{exams.length}</span>
        </div>

        <span className="der-status-legend">
          <span className="der-status-dot" aria-hidden="true" />
          Finalizados
        </span>
      </div>

      {listLoading && (
        <p className="der-feedback">Cargando exámenes finalizados...</p>
      )}

      {listError && (
        <p className="der-feedback der-error" role="alert">
          {listError}
        </p>
      )}

      {!listLoading && !listError && exams.length === 0 && (
        <p className="der-feedback">
          No hay exámenes finalizados que coincidan con tu búsqueda.
        </p>
      )}

      {!listLoading && !listError && exams.length > 0 && (
        <section className="der-exam-table" aria-label="Exámenes finalizados">
          {exams.map((exam) => (
            <button
              type="button"
              className="der-exam-row"
              key={exam.exam_id}
              onClick={() => void handleSelectExam(exam.exam_id)}
            >
              <span className="der-exam-info">
                <strong>{exam.subject_name}</strong>
                <small>
                  {formatDisplayDate(exam.date)} · {formatTime(exam.start_time)} -{' '}
                  {formatTime(exam.end_time)}
                </small>
              </span>

              <span className="der-exam-tags">
                <span className="der-chip">G{exam.group}</span>
                <span className="der-chip">
                  {abbreviateExamType(exam.exam_type)}
                </span>
                <span className="der-status-dot" aria-hidden="true" />
                <svg
                  className="der-row-chevron"
                  viewBox="0 0 12 12"
                  aria-hidden="true"
                >
                  <path d="M4.5 2.5L8 6L4.5 9.5" />
                </svg>
              </span>
            </button>
          ))}
        </section>
      )}
    </main>
  );
}
