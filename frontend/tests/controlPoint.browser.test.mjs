import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import { createServer } from 'vite';

// Uses an installed Chrome, native CDP and mocked API responses. No real student
// entries are registered, and no additional browser-testing dependency is needed.
const chromePath = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

test('control points: assigned rooms, filters, search and access results in a mobile browser', {
  skip: !existsSync(chromePath), timeout: 60_000,
}, async (t) => {
  const tempRoot = resolve('node_modules/.tmp');
  await mkdir(tempRoot, { recursive: true });
  const profile = await mkdtemp(join(tempRoot, 'control-point-browser-'));
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, clearScreen: false });
  await server.listen();
  const chrome = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  let socket;
  let send;
  t.after(async () => {
    if (send && socket?.readyState === WebSocket.OPEN) {
      try {
        const screenshot = await send('Page.captureScreenshot', { format: 'png' });
        await writeFile(join(tempRoot, 'control-points-mobile.png'), Buffer.from(screenshot.data, 'base64'));
      } catch { /* Browser may have closed after a failed startup. */ }
      try { await send('Browser.close'); } catch { /* Closing can end the connection first. */ }
    }
    socket?.close();
    chrome.kill();
    await server.close();
    await delay(300);
    // Restrict recursive cleanup to the exact temporary profile created above.
    if (dirname(profile) === tempRoot && basename(profile).startsWith('control-point-browser-')) {
      await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  });

  let debugPort;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { debugPort = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; }
    catch { await delay(100); }
  }
  assert.ok(debugPort, 'Chrome must start its debugging endpoint');
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  socket = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((done, reject) => { socket.addEventListener('open', done, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let nextId = 0;
  const pending = new Map();
  const runtimeErrors = [];
  const unexpectedRequests = [];
  const checks = [];
  const observations = [];
  let observationMode = 'validation';
  let resultMode = 'HABILITADO';
  send = (method, params = {}) => new Promise((done, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timed out: ${method}`)); }, 8000);
    pending.set(id, { done: (result) => { clearTimeout(timer); done(result); }, reject: (error) => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const student = { user_id: 101, codigo_sis: '202001234', ci: '7891234', full_name: 'Álvarez Claros Pedro' };
  const exam = {
    exam_id: '15', course_group_id: '3', subject_name: 'Teoría de Autómatas', group: '1', exam_type: 'PRIMER PARCIAL',
    date: '2026-11-10', start_time: '08:00:00', end_time: '09:30:00', general_rules: ['Carnet de identidad obligatorio'],
    rooms: [{ room_id: '1', room_name: 'Aula 691A', assistant_id: 8, can_interact: false },
      { room_id: '2', room_name: 'Aula 691B', assistant_id: 25, can_interact: true },
      { room_id: '3', room_name: 'Auditorio', assistant_id: 25, can_interact: true }],
  };
  const accessResponse = () => ({
    success: resultMode !== 'ESTUDIANTE NO ENCONTRADO',
    data: {
      student: resultMode === 'ESTUDIANTE NO ENCONTRADO' ? null : student,
      access: { result: resultMode, assigned_room_id: 2, assigned_room_name: 'Aula 691B',
        check_in_time: ['HABILITADO', 'YA REGISTRÓ INGRESO'].includes(resultMode) ? '2026-11-10 08:12:00' : null,
        ineligibility_reason: resultMode === 'INHABILITADO' ? 'Requisitos académicos pendientes.' : null,
        norma_particular: 'Tiempo adicional de 30 minutos' },
      expulsion_history: [{ exam_id: '7', subject_name: 'Cálculo II', group: '2', academic_term: '1/2026', exam_type: 'EXAMEN FINAL', date: '2026-06-10', room_name: 'Aula 10', reason: 'Material no autorizado.' }],
    }, message: 'Resultado de la verificación.',
  });
  const route = async ({ requestId, request }) => {
    let body;
    let status = 200;
    const path = new URL(request.url).pathname;
    if (request.method === 'OPTIONS') body = {};
    else if (path === '/api/exams') body = { success: true, data: [exam, { ...exam, exam_id: '16', subject_name: 'Seguridad de Sistemas', course_group_id: '4', exam_type: 'EXAMEN FINAL', rooms: [exam.rooms[0]] }] };
    else if (path === '/api/course-groups') body = { success: true, data: [{ course_group_id: '3', academic_term: '2/2026' }, { course_group_id: '4', academic_term: '1/2026' }] };
    else if (path === '/api/catalog/exam-types') body = { success: true, data: [
      { value: 1, label: 'PRIMER PARCIAL' }, { value: 2, label: 'SEGUNDO PARCIAL' },
      { value: 3, label: 'EXAMEN FINAL' }, { value: 4, label: 'SEGUNDA INSTANCIA' }, { value: 5, label: 'EXAMEN DE MESA' },
    ] };
    else if (path === '/api/courses/3/students') body = { success: true, data: [{ userId: 101, studentKey: student.codigo_sis, ci: student.ci, fullName: student.full_name, status: 'HABILITADO', ineligibilityReason: null }] };
    else if (path === '/api/exam-access/check') {
      checks.push(JSON.parse(request.postData));
      await delay(60);
      status = resultMode === 'FORBIDDEN' ? 403 : resultMode === 'ESTUDIANTE NO ENCONTRADO' ? 404 : 200;
      body = resultMode === 'FORBIDDEN' ? { success: false, message: 'Asignación revocada.' } : accessResponse();
    } else if (path === '/api/exam-access/observations') {
      const payload = JSON.parse(request.postData);
      observations.push(payload);
      await delay(60);
      status = observationMode === 'validation' ? 422 : 200;
      body = observationMode === 'validation'
        ? { success: false, errors: { observation: ['Observación inválida.'] } }
        : { success: true, data: { student, exam_id: payload.exam_id, observation: payload.observation, updated_at: '2026-11-10T12:15:00Z' }, message: 'Observación registrada correctamente.' };
    } else { unexpectedRequests.push(path); status = 500; body = { message: `Unexpected request: ${path}` }; }
    await send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [
      { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' },
      { name: 'Access-Control-Allow-Headers', value: '*' }, { name: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
    ], body: Buffer.from(JSON.stringify(body)).toString('base64') });
  };
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const waiter = pending.get(message.id);
      if (!waiter) return;
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message));
      else waiter.done(message.result);
    } else if (message.method === 'Fetch.requestPaused') {
      route(message.params).catch((error) => runtimeErrors.push(error.message));
    } else if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.text);
  });
  const evaluate = async (expression) => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
    return response.result.value;
  };
  const waitFor = async (expression) => {
    for (let attempt = 0; attempt < 100; attempt++) { if (await evaluate(expression)) return; await delay(50); }
    throw new Error(`UI condition timed out: ${expression}`);
  };
  const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const fill = (selector, value) => evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const select = async (selector, value) => {
    await click(selector);
    await waitFor(`document.querySelector('.cp-filter-menu') !== null`);
    await evaluate(`Array.from(document.querySelectorAll('.cp-filter-menu [role="option"]')).find((option) => option.dataset.value === ${JSON.stringify(value)}).click()`);
  };
  const key = async (keyName, code, virtualKeyCode) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: keyName, code, windowsVirtualKeyCode: virtualKeyCode });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code, windowsVirtualKeyCode: virtualKeyCode });
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: 'http://127.0.0.1:8000/api/*' }] });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const claims = Buffer.from(JSON.stringify({ sub: 25, name: 'Ana Auxiliar', roles: ['AUXILIAR'], functions: ['EDITAR_DATOS_PERSONALES'], exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const session = { token: `e30.${claims}.test`, is_active: true, token_type: 'bearer', expires_in: 3600 };
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('exam_access_control_session', ${JSON.stringify(JSON.stringify(session))});` });
  await send('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/` });

  await t.test('opens from the panel and combines filters', async () => {
    await waitFor(`Array.from(document.querySelectorAll('.admin-menu-card')).some((button) => button.textContent.includes('Puntos de control'))`);
    await evaluate(`Array.from(document.querySelectorAll('.admin-menu-card')).find((button) => button.textContent.includes('Puntos de control')).click()`);
    await waitFor(`document.querySelectorAll('.cp-exam-row').length === 3`);
    assert.equal(await evaluate(`document.querySelectorAll('.cp-exam-row:disabled').length`), 1);
    assert.equal(await evaluate(`/Aula|Auditorio/.test(document.querySelector('.cp-exam-list').textContent)`), false);
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(tempRoot, 'control-points-list.png'), Buffer.from(screenshot.data, 'base64'));
    assert.equal(await evaluate(`document.querySelectorAll('.cp-filter-trigger > .cp-icon').length`), 6);
    await click('[aria-label="Filtrar por tipo de examen"]');
    await waitFor(`document.querySelectorAll('.cp-filter-menu [role="option"]').length === 5`);
    const typeScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(tempRoot, 'control-points-filter-type.png'), Buffer.from(typeScreenshot.data, 'base64'));
    await key('Escape', 'Escape', 27);
    await waitFor(`document.querySelector('.cp-filter-menu') === null`);
    await click('[aria-label="Filtrar por estado"]');
    await waitFor(`document.querySelectorAll('.cp-filter-state .cp-icon').length === 3`);
    const statusScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(tempRoot, 'control-points-filter-status.png'), Buffer.from(statusScreenshot.data, 'base64'));
    await key('Escape', 'Escape', 27);
    await evaluate(`document.querySelector('[aria-label="Filtrar por estado"]').focus()`);
    await key('ArrowDown', 'ArrowDown', 40);
    await waitFor(`document.activeElement?.getAttribute('role') === 'option'`);
    assert.equal(await evaluate(`document.activeElement.dataset.value`), 'En curso');
    await key('ArrowDown', 'ArrowDown', 40);
    assert.equal(await evaluate(`document.activeElement.dataset.value`), 'Próximamente');
    await key('Enter', 'Enter', 13);
    await waitFor(`document.querySelector('[aria-label="Filtrar por estado"]').textContent.includes('Próximamente') && !document.querySelector('.cp-filter-menu')`);
    await click('.cp-search button');
    await fill('#cp-subject-search', 'automatas');
    await waitFor(`document.querySelectorAll('.cp-exam-row').length === 2`);
    await select('[aria-label="Filtrar por tipo de examen"]', 'EXAMEN FINAL');
    await waitFor(`document.body.textContent.includes('No se encontraron exámenes con estos filtros.')`);
    await click('.cp-search button');
    await waitFor(`document.querySelectorAll('.cp-exam-row').length === 3`);
    await select('[aria-label="Filtrar por gestión"]', '2/2026');
    await waitFor(`document.querySelectorAll('.cp-exam-row').length === 2`);
  });

  await t.test('opens the assigned room directly from the subject and typing does not register an entry', async () => {
    assert.equal(await evaluate(`document.querySelector('.cp-exam-list details') === null`), true);
    await click('.cp-exam-row:not(:disabled)');
    await waitFor(`document.querySelector('#cp-student-query') && !document.body.textContent.includes('Cargando estudiantes...')`);
    assert.equal(await evaluate(`document.querySelector('.cp-exam-heading').textContent.includes('Aula 691B')`), true);
    assert.equal(await evaluate(`document.querySelector('#cp-student-query').value === '' && document.querySelectorAll('.cp-student-row').length === 1`), true);
    assert.equal(checks.length, 0);
    const initialScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(tempRoot, 'control-points-students.png'), Buffer.from(initialScreenshot.data, 'base64'));
    await fill('#cp-student-query', 'Pedro');
    await waitFor(`document.querySelectorAll('.cp-student-row').length === 1`);
    assert.equal(checks.length, 0);
    await click('.cp-student-row');
    await waitFor(`document.querySelector('.cp-result-card h2')?.textContent.includes('HABILITADO')`);
    assert.deepEqual(checks, [{ identifier: '202001234', exam_id: 15, room_id: 2 }]);
    assert.equal(await evaluate(`document.body.textContent.includes('Material no autorizado.') && document.body.textContent.includes('Tiempo adicional de 30 minutos')`), true);
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(tempRoot, 'control-points-ingress.png'), Buffer.from(screenshot.data, 'base64'));
  });

  await t.test('validates observations, preserves failed text, prevents duplicate saves and confirms success', async () => {
    assert.equal(await evaluate(`document.querySelector('.cp-observation button[type="submit"]').disabled`), true);
    await fill('#cp-observation-text', '   ');
    assert.equal(await evaluate(`document.querySelector('.cp-observation button[type="submit"]').disabled`), true);
    await fill('#cp-observation-text', ' Estudiante con lentes sospechosos ');
    await click('.cp-observation button[type="submit"]');
    await waitFor(`document.querySelector('.cp-observation [role="alert"]')?.textContent.includes('Observación inválida.')`);
    assert.equal(await evaluate(`document.querySelector('#cp-observation-text').value`), ' Estudiante con lentes sospechosos ');
    observationMode = 'success';
    await evaluate(`(() => { const button = document.querySelector('.cp-observation button[type="submit"]'); button.click(); button.click(); })()`);
    await waitFor(`document.querySelector('.cp-save-notice')?.textContent.includes('Observación registrada correctamente.')`);
    assert.equal(observations.length, 2);
    assert.deepEqual(observations[1], { identifier: '202001234', exam_id: 15, observation: 'Estudiante con lentes sospechosos' });
    assert.equal(await evaluate(`document.querySelector('.cp-observation button[type="submit"]').disabled`), true);
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(tempRoot, 'control-points-observation.png'), Buffer.from(screenshot.data, 'base64'));
  });

  await t.test('renders repeated entry, wrong room, ineligible, missing exam, and not-found responses', async () => {
    for (const mode of ['YA REGISTRÓ INGRESO', 'AULA INCORRECTA', 'INHABILITADO', 'NO FIGURA EN EL EXAMEN', 'ESTUDIANTE NO ENCONTRADO']) {
      resultMode = mode;
      await fill('#cp-student-query', '');
      await fill('#cp-student-query', '7891234');
      await waitFor(`!document.querySelector('.cp-result-card')`);
      await click('.cp-check-button');
      await waitFor(`document.querySelector('.cp-result-card h2')?.textContent.includes(${JSON.stringify(mode)})`);
      if (mode !== 'YA REGISTRÓ INGRESO') assert.equal(await evaluate(`document.querySelector('.cp-observation') === null`), true);
    }
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
  });

  await t.test('locks the control when backend assignment is revoked', async () => {
    resultMode = 'FORBIDDEN';
    await fill('#cp-student-query', '202001234');
    await click('.cp-check-button');
    await waitFor(`document.body.textContent.includes('Asignación revocada.')`);
    assert.equal(await evaluate(`document.querySelector('#cp-student-query').disabled && document.querySelector('.cp-check-button').disabled`), true);
  });
  assert.deepEqual(runtimeErrors, []);
  assert.deepEqual(unexpectedRequests, []);
});
