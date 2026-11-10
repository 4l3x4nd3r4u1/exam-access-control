import { useRef, useState } from 'react';
import logoSvg from '../assets/Group 9.svg';
import { authService } from '../services/authService';
import type { UserSession } from '../types/auth';

interface LoginViewProps {
  onLoginSuccess: (session: UserSession) => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const submitting = useRef(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!identifier.trim() || !password || submitting.current) return;

    submitting.current = true;
    setError(null);
    setIsLoading(true);
    try {
      const session = await authService.login(identifier, password);
      onLoginSuccess(session);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo iniciar sesión.');
    } finally {
      submitting.current = false;
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
          <label htmlFor="identifier-input" className="input-label">CI o correo</label>
          <div className="input-field-wrapper">
            <input
              id="identifier-input"
              type="text"
              className="text-input"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="CI o correo electrónico"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={150}
              required
            />
            {identifier && (
              <button
                type="button"
                className="clear-btn"
                onClick={() => setIdentifier('')}
                aria-label="Limpiar CI o correo"
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

        <button type="submit" className="submit-btn" disabled={isLoading || !identifier.trim() || !password}>
          {isLoading ? 'Iniciando sesión...' : 'Empezar'}
        </button>

        {error && <p className="auth-error-text" role="alert">{error}</p>}
      </form>
    </main>
  );
}
