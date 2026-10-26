import assert from 'node:assert/strict';
import { after, afterEach, beforeEach, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const { controlPointService, ControlPointApiError } = await server.ssrLoadModule('/src/services/controlPointService.ts');
const originalFetch = globalThis.fetch;
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => JSON.stringify({ token: 'test-token' }) },
  });
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else delete globalThis.localStorage;
});
after(() => server.close());

test('lists exams using the current session and supports cancellation', async () => {
  const abort = new AbortController();
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:8000/api/exams');
    assert.equal(options.headers.get('Authorization'), 'Bearer test-token');
    assert.equal(options.signal, abort.signal);
    return Response.json({ success: true, data: [{ exam_id: '15' }] });
  };
  assert.deepEqual(await controlPointService.getExams(abort.signal), [{ exam_id: '15' }]);
});

test('checks access only when explicitly called and sends the selected exam and room', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:8000/api/exam-access/check');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), { identifier: '202001234', exam_id: 15, room_id: 2 });
    return Response.json({ success: true, data: { access: { result: 'HABILITADO' } } });
  };
  const response = await controlPointService.checkAccess({ identifier: ' 202001234 ', exam_id: 15, room_id: 2 });
  assert.equal(response.data.access.result, 'HABILITADO');
});

test('preserves student-not-found data from HTTP 404', async () => {
  const body = { success: false, data: { student: null, access: { result: 'ESTUDIANTE NO ENCONTRADO' }, expulsion_history: [] } };
  globalThis.fetch = async () => Response.json(body, { status: 404 });
  assert.deepEqual(await controlPointService.checkAccess({ identifier: 'unknown', exam_id: 15, room_id: 2 }), body);
});

test('a successful HTTP response does not imply permission to enter', async () => {
  globalThis.fetch = async () => Response.json({ success: true, data: { access: { result: 'INHABILITADO' } } });
  const response = await controlPointService.checkAccess({ identifier: '202001234', exam_id: 15, room_id: 2 });
  assert.equal(response.data.access.result, 'INHABILITADO');
});

test('keeps HTTP 403 so the view can block an assignment that was revoked', async () => {
  globalThis.fetch = async () => Response.json({ success: false, message: 'Sin permiso.' }, { status: 403 });
  await assert.rejects(controlPointService.checkAccess({ identifier: '202001234', exam_id: 15, room_id: 2 }),
    (error) => error instanceof ControlPointApiError && error.status === 403 && error.message === 'Sin permiso.');
});

test('saves trimmed observations and exposes field validation errors', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:8000/api/exam-access/observations');
    assert.deepEqual(JSON.parse(options.body), { identifier: '202001234', exam_id: 15, observation: 'Lentes sospechosos' });
    return Response.json({ success: false, errors: { observation: ['Observación inválida.'] } }, { status: 422 });
  };
  await assert.rejects(controlPointService.saveObservation({ identifier: ' 202001234 ', exam_id: 15, observation: ' Lentes sospechosos ' }),
    (error) => error.status === 422 && error.message === 'Observación inválida.');
});
