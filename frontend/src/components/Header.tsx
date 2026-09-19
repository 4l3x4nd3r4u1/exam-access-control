import React from 'react';
import type { UserSession } from '../types/auth';

interface HeaderProps {
  session: UserSession;
  title?: string;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ session, title = 'Panel', onLogout }) => {
  const roleLabel = session.role === 'ADMIN' ? 'Administrador' : 'Docente';

  return (
    <header className="panel-header">
      <div className="panel-top-row">
        <h1 className="panel-title">{title}</h1>
        <div className="header-actions">

          <button
            type="button"
            className="header-icon-btn"
            onClick={onLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
      <p className="panel-subtitle">
        {roleLabel} &nbsp;•&nbsp; {session.full_name || session.email}
      </p>
    </header>
  );
};
