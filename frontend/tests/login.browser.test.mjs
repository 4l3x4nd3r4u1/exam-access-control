import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import { createServer } from 'vite';

// Browser fixtures stay inside this test. They never create or modify real users.
const chromePath = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

test('login with CI or email: form, errors and existing session behavior', {
  skip: !existsSync(chromePath), timeout: 60_000,
}, async (t) => {
  const tempRoot = resolve('node_modules/.tmp');
  await mkdir(tempRoot, { recursive: true });
  const profile = await mkdtemp(join(tempRoot, 'login-ci-browser-'));
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
      try { await send('Browser.close'); } catch { /* The browser may close the connection first. */ }
    }
    socket?.close();
    chrome.kill();
    await server.close();
    await delay(300);
    // Remove only the exact profile created by this test, under the resolved temporary root.
    if (dirname(profile) === tempRoot && basename(profile).startsWith('login-ci-browser-')) {
      await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  });

  let debugPort;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { debugPort = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; }
    catch { await delay(100); }
  }
  assert.ok(debugPort, 'An installed Chrome must start its debugging endpoint');
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((done, reject) => { socket.addEventListener('open', done, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let nextId = 0;
  const pending = new Map();
  const runtimeErrors = [];
  const requests = [];
  const unexpected = [];
  let mode = 'success';
  send = (method, params = {}) => new Promise((done, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timed out: ${method}`)); }, 8000);
    pending.set(id, {
      done: result => { clearTimeout(timer); done(result); },
      reject: error => { clearTimeout(timer); reject(error); },
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const claims = Buffer.from(JSON.stringify({
    sub: 42, name: 'Docente de prueba', email: 'prueba@umss.edu.bo', ci: '00123456-Ab LP',
    roles: ['DOCENTE'], functions: ['VISUALIZAR_MATERIAS_ASIGNADAS'], exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url');
  const session = { token: `e30.${claims}.fixture`, is_active: true, token_type: 'bearer', expires_in: 3600 };
  async function route({ requestId, request }) {
    let status = 200, body = {};
    if (request.method !== 'OPTIONS') {
      if (new URL(request.url).pathname !== '/api/auth/login') { unexpected.push(request.url); status = 500; }
      else {
        requests.push(JSON.parse(request.postData));
        await delay(150);
        if (mode === 'invalid') { status = 401; body = { success: false, message: 'Credenciales incorrectas' }; }
        else if (mode === 'inactive') { status = 401; body = { success: false, message: 'Usuario inactivo o deshabilitado' }; }
        else if (mode === 'validation') { status = 422; body = { message: 'Datos inválidos.', errors: { identifier: ['El CI o correo debe ser un texto.'] } }; }
        else body = { success: true, data: session };
      }
    }
    await send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [
      { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' },
      { name: 'Access-Control-Allow-Headers', value: '*' }, { name: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
    ], body: Buffer.from(JSON.stringify(body)).toString('base64') });
  }
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const waiter = pending.get(message.id);
      if (!waiter) return;
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message));
      else waiter.done(message.result);
    } else if (message.method === 'Fetch.requestPaused') route(message.params).catch(error => runtimeErrors.push(error.message));
    else if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.text);
  });
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
    return response.result.value;
  };
  const waitFor = async expression => {
    for (let attempt = 0; attempt < 100; attempt++) { if (await evaluate(expression)) return; await delay(50); }
    throw new Error(`UI condition timed out: ${expression}`);
  };
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const fill = (selector, value) => evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const reset = async () => {
    await evaluate(`localStorage.removeItem('exam_access_control_session')`);
    await send('Page.reload');
    await waitFor(`document.querySelector('#identifier-input') !== null`);
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: 'http://127.0.0.1:8000/api/*' }] });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/` });
  await waitFor(`document.querySelector('#identifier-input') !== null`);

  await t.test('accepts CI as text and prevents empty or whitespace-only submissions', async () => {
    assert.equal(await evaluate(`document.querySelector('label[for="identifier-input"]').textContent`), 'CI o correo');
    assert.equal(await evaluate(`document.querySelector('#identifier-input').type`), 'text');
    assert.equal(await evaluate(`document.querySelector('#identifier-input').autocomplete`), 'username');
    await fill('#identifier-input', '   ');
    await fill('#password-input', 'password-test');
    assert.equal(await evaluate(`document.querySelector('.submit-btn').disabled`), true);
    await click('.submit-btn');
    assert.equal(requests.length, 0);
    await fill('#identifier-input', '00123456-Ab LP');
    assert.equal(await evaluate(`document.querySelector('#identifier-input').checkValidity()`), true);
    await click('[aria-label="Limpiar CI o correo"]');
    assert.equal(await evaluate(`document.querySelector('#identifier-input').value`), '');
  });

  await t.test('shows credential errors without saving a token and allows retry', async () => {
    mode = 'invalid';
    await fill('#identifier-input', '00123456-Ab LP');
    await click('.submit-btn');
    await waitFor(`document.querySelector('[role="alert"]')?.textContent.includes('Credenciales incorrectas')`);
    assert.equal(await evaluate(`localStorage.getItem('exam_access_control_session')`), null);
    assert.equal(await evaluate(`document.querySelector('#identifier-input').value`), '00123456-Ab LP');
    assert.equal(await evaluate(`document.querySelector('.submit-btn').disabled`), false);
  });

  await t.test('logs in by CI once and keeps the existing dashboard permissions', async () => {
    mode = 'success';
    await fill('#identifier-input', ' 00123456-Ab LP ');
    await fill('#password-input', ' clave con espacios ');
    const before = requests.length;
    await evaluate(`document.querySelector('.submit-btn').click(); document.querySelector('.submit-btn').click()`);
    await waitFor(`document.querySelector('.admin-menu-card') !== null`);
    assert.equal(requests.length, before + 1);
    assert.deepEqual(requests.at(-1), { identifier: '00123456-Ab LP', password: ' clave con espacios ' });
    assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem('exam_access_control_session'))`), session);
    assert.equal(await evaluate(`document.body.textContent.includes('Docente de prueba')`), true);
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('.admin-menu-card')).some(card => card.textContent.includes('Visualizar materias'))`), true);
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('.admin-menu-card')).some(card => card.textContent.includes('Registrar personal'))`), false);
  });

  await t.test('restores the authenticated session on reload without another login', async () => {
    const before = requests.length;
    await send('Page.reload');
    await waitFor(`document.querySelector('.admin-menu-card') !== null`);
    assert.equal(await evaluate(`document.querySelector('#identifier-input') === null`), true);
    assert.equal(requests.length, before);
  });

  await t.test('email uses the same field and retains backward-compatible session behavior', async () => {
    await reset();
    await fill('#identifier-input', ' PRUEBA@UMSS.EDU.BO ');
    await fill('#password-input', 'password-test');
    await click('.submit-btn');
    await waitFor(`document.querySelector('.admin-menu-card') !== null`);
    assert.deepEqual(requests.at(-1), { identifier: 'PRUEBA@UMSS.EDU.BO', password: 'password-test' });
  });

  await t.test('validation and inactive-user errors leave the user on the login screen', async () => {
    for (const [responseMode, text] of [['validation', 'El CI o correo debe ser un texto.'], ['inactive', 'Usuario inactivo o deshabilitado']]) {
      mode = responseMode;
      await reset();
      await fill('#identifier-input', '30000001');
      await fill('#password-input', 'password-test');
      await click('.submit-btn');
      await waitFor(`document.querySelector('[role="alert"]')?.textContent.includes(${JSON.stringify(text)})`);
      assert.equal(await evaluate(`localStorage.getItem('exam_access_control_session')`), null);
      assert.equal(await evaluate(`document.querySelector('.submit-btn').disabled`), false);
    }
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(tempRoot, 'login-ci-correo-mobile.png'), Buffer.from(screenshot.data, 'base64'));
  });
  assert.deepEqual(unexpected, []);
  assert.deepEqual(runtimeErrors, []);
});
