import { useEffect, useState } from 'react';
import type { PanelData } from '../../types/PanelData';
import './PanelPage.css';

function PanelPage() {
  const [panelData, setPanelData] = useState<PanelData | null>(null);

  useEffect(() => {
    const data: PanelData = {
      user: {
        fullName: 'Perez Gomez Juan',
        role: 'Administrador',
      },
      summary: {
        gestion: '2 / 2026',
        estudiantes: 1240,
        planillasProcesadas: 1,
        usuarios: 15,
      },
    };

    setPanelData(data);
  }, []);

  if (!panelData) {
    return null;
  }

  return (
    <main className="panel-page">
      <header className="panel-header">
        <div>
          <h1>Panel</h1>

          <div className="panel-user">
            <span>{panelData.user.role}</span>
            <span>•</span>
            <span>{panelData.user.fullName}</span>
          </div>
        </div>

        <div className="header-icons">
          <button type="button" aria-label="Apariencia">
            ☼
          </button>

          <button type="button" aria-label="Configuración">
            ⚙
          </button>
        </div>
      </header>

      <section className="summary">
        <h2>Resumen</h2>

        <div className="summary-row">
          <span className="summary-dot gestion-dot"></span>
          <span>Gestión</span>
          <strong>{panelData.summary.gestion}</strong>
        </div>

        <div className="summary-row">
          <span className="summary-dot students-dot"></span>
          <span>Estudiantes</span>
          <strong>
            {panelData.summary.estudiantes.toLocaleString('es-BO')}
          </strong>
        </div>

        <div className="summary-row">
          <span className="summary-dot sheets-dot"></span>
          <span>Planillas Procesadas</span>
          <strong>{panelData.summary.planillasProcesadas}</strong>
        </div>

        <div className="summary-row">
          <span className="summary-dot users-dot"></span>
          <span>Usuarios</span>
          <strong>{panelData.summary.usuarios}</strong>
        </div>
      </section>

      <section className="panel-actions">
        <button type="button" className="panel-action">
          <div className="action-image sheet-icon">
            <div className="sheet-lines"></div>
          </div>

          <span>
            Importar
            <br />
            planilla
          </span>
        </button>

        <button type="button" className="panel-action">
          <div className="action-image folder-icon">
            <div className="folder-body"></div>
          </div>

          <span>
            Planillas
            <br />
            importadas
          </span>
        </button>

        <button type="button" className="panel-action">
          <div className="action-image academic-icon">
            <div className="folder-shape"></div>
          </div>

          <span>
            Personal
            <br />
            Académico
          </span>
        </button>
      </section>
    </main>
  );
}

export default PanelPage;