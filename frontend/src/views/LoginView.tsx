import { useState } from 'react';
import logoSvg from '../assets/Group 9.svg';
import { authService } from '../services/authService';
import type { UserSession } from '../types/auth';

interface LoginViewProps {
  onLoginSuccess: (session: UserSession) => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) return;

    setError(null);
    setIsLoading(true);
    try {
      const session = await authService.login(email, password);
      onLoginSuccess(session);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo iniciar sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="app-shell login-container">
      <div className="logo-wrapper">
        <img src={logoSvg} alt="" className="logo-img" />
      </div>

      <h1 className="login-title">
        Sistema de Control de<br />
        Ingreso a Exámenes
      </h1>

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="input-card">
          <label htmlFor="email-input" className="input-label">Correo</label>
          <div className="input-field-wrapper">
            <input
              id="email-input"
              type="email"
              className="text-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="docente@umss.edu.bo"
              autoComplete="email"
              required
            />
            {email && (
              <button
                type="button"
                className="clear-btn"
                onClick={() => setEmail('')}
                aria-label="Limpiar correo"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="input-card">
          <label htmlFor="password-input" className="input-label">Contraseña</label>
          <div className="input-field-wrapper">
            <input
              id="password-input"
              type="password"
              className="text-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••••••••••"
              autoComplete="current-password"
              required
            />
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={isLoading || !email || !password}>
          {isLoading ? 'Iniciando sesión...' : 'Empezar'}
        </button>

        {error && <p className="auth-error-text" role="alert">{error}</p>}
      </form>
    </main>
  );
}
