import React, { useState } from 'react';
import logoSvg from '../assets/Group 9.svg';
import type { UserSession } from '../types/auth';
import { authService } from '../services/authService';

interface LoginViewProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      const session = await authService.login(email.trim(), password);
      onLoginSuccess(session);
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-container">
      {/* Logo */}
      <div className="logo-wrapper">
        <img src={logoSvg} alt="Logo institucional" className="logo-img" />
      </div>

          {/* Título */}
          <h1 className="login-title">
            Sistema de Control de<br />
            Ingreso a Exámenes
          </h1>

          {/* Formulario de Login (HU-01) */}
          <form className="login-form" onSubmit={handleSubmit}>
            {/* Input Correo */}
            <div className="input-card">
              <label htmlFor="email-input" className="input-label">
                Correo
              </label>
              <div className="input-field-wrapper">
                <input
                  id="email-input"
                  type="email"
                  className="text-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doncente@umss.edu.bo"
                  autoComplete="email"
                  required
                />
                {email.length > 0 && (
                  <button
                    type="button"
                    className="clear-btn"
                    onClick={() => setEmail('')}
                    title="Limpiar"
                    aria-label="Limpiar correo"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Input Contraseña */}
            <div className="input-card">
              <label htmlFor="password-input" className="input-label">
                Contraseña
              </label>
              <div className="input-field-wrapper">
                <input
                  id="password-input"
                  type="password"
                  className="text-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  autoComplete="current-password"
                  required
                />
                {password.length > 0 && (
                  <button
                    type="button"
                    className="clear-btn"
                    onClick={() => setPassword('')}
                    title="Limpiar"
                    aria-label="Limpiar contraseña"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Botón Empezar */}
            <button
              type="submit"
              className="submit-btn"
              disabled={loading || !email || !password}
            >
              {loading ? 'Iniciando sesión...' : 'Empezar'}
            </button>

            {/* Mensaje de Error */}
            {error && (
              <p className="auth-error-text" role="alert">
                {error}
              </p>
            )}
          </form>
    </main>
  );
};
