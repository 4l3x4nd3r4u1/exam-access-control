import { useState } from 'react';
import logo from '../../assets/logo.jpg';
import { login } from '../../services/authService';
import './LoginPage.css';


function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  setError('');
  setLoading(true);

  try {
    const response = await login(email, password);

    console.log('Inicio de sesión exitoso:', response);

    sessionStorage.setItem('token', response.data.token);
  } catch (error) {
    if (error instanceof Error) {
      setError(error.message);
      } else {
        setError('No se pudo iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-container">

        <div className="login-logo">
          <img src={logo} alt="Logo del sistema" />
        </div>

        <h1>
          Sistema de Control de
          <br />
          Ingreso a Exámenes
        </h1>

        <form className="login-form" onSubmit={handleSubmit}>
           {error && <p className="login-error">{error}</p>}
          <div className="input-container">
            <label htmlFor="email">Correo</label>

            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ingrese su correo"
              required
            />

            {email && (
              <button
                type="button"
                className="clear-button"
                onClick={() => setEmail('')}
              >
                ×
              </button>
            )}
          </div>

          <div className="input-container">
            <label htmlFor="password">Contraseña</label>

            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
             type="submit"
             className="login-button"
             disabled={loading}
          >
             {loading ? 'Ingresando...' : 'Empezar'}
          </button>

        </form>
      </section>
    </main>
  );
}

export default LoginPage;