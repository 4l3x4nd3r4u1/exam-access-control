import assert from 'node:assert/strict';
import { after, afterEach, beforeEach, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const { authService, hasFunction, hasRole } = await server.ssrLoadModule('/src/services/authService.ts');
const originalFetch = globalThis.fetch;
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const values = new Map();
const storageKey = 'exam_access_control_session';

function tokenSession(extra = {}) {
  const claims = {
    sub: 42, name: 'Usuario de prueba', email: 'prueba@umss.edu.bo', ci: '00123456-Ab LP',
    roles: ['DOCENTE'], functions: ['VISUALIZAR_MATERIAS_ASIGNADAS'], exp: Math.floor(Date.now() / 1000) + 3600,
    ...extra,
  };
  return { token: `e30.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.fixture`, is_active: true, token_type: 'bearer', expires_in: 3600 };
}

beforeEach(() => {
  values.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  });
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else delete globalThis.localStorage;
});
after(() => server.close());

test('sends CI as text, preserves leading zeroes and letters, and does not trim the password', async () => {
  const session = tokenSession();
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:8000/api/auth/login');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), { identifier: '00123456-Ab LP', password: ' clave con espacios ' });
    return Response.json({ success: true, data: session });
  };
  const user = await authService.login(' 00123456-Ab LP ', ' clave con espacios ');
  assert.equal(user.user_id, 42);
  assert.equal(user.ci, '00123456-Ab LP');
  assert.equal(hasRole(user, 'DOCENTE'), true);
  assert.equal(hasFunction(user, 'VISUALIZAR_MATERIAS_ASIGNADAS'), true);
  assert.deepEqual(JSON.parse(values.get(storageKey)), session);
  assert.deepEqual(authService.getStoredSession(), user);
});

test('sends email through the same identifier contract and restores an account without CI', async () => {
  globalThis.fetch = async (url, options) => {
    assert.deepEqual(JSON.parse(options.body), { identifier: 'PRUEBA@UMSS.EDU.BO', password: 'password-test' });
    return Response.json({ success: true, data: tokenSession({ ci: null }) });
  };
  const user = await authService.login(' PRUEBA@UMSS.EDU.BO ', 'password-test');
  assert.equal(user.email, 'prueba@umss.edu.bo');
  assert.equal(user.ci, null);
});

test('incorrect credentials preserve the error and do not store a session', async () => {
  globalThis.fetch = async () => Response.json({ success: false, message: 'Credenciales incorrectas' }, { status: 401 });
  await assert.rejects(authService.login('00123456-Ab LP', 'incorrecta'), /Credenciales incorrectas/);
  assert.equal(values.has(storageKey), false);
});

test('shows identifier validation errors from the API without storing a session', async () => {
  globalThis.fetch = async () => Response.json({ message: 'Datos inválidos.', errors: { identifier: ['El CI o correo es obligatorio.'] } }, { status: 422 });
  await assert.rejects(authService.login(' ', 'password-test'), /El CI o correo es obligatorio/);
  assert.equal(values.has(storageKey), false);
});

test('a rejected login does not overwrite an existing saved token', async () => {
  const session = tokenSession();
  values.set(storageKey, JSON.stringify(session));
  globalThis.fetch = async () => Response.json({ success: false, message: 'Usuario inactivo o deshabilitado' }, { status: 401 });
  await assert.rejects(authService.login('00123456-Ab LP', 'password-test'), /Usuario inactivo/);
  assert.deepEqual(JSON.parse(values.get(storageKey)), session);
});

test('does not persist an invalid token returned with HTTP 200', async () => {
  globalThis.fetch = async () => Response.json({ success: true, data: { token: 'invalid-token', is_active: true } });
  await assert.rejects(authService.login('00123456-Ab LP', 'password-test'), /El token recibido no tiene un formato válido/);
  assert.equal(values.has(storageKey), false);
});
