const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(fetchImpl) {
  let submit, timeout, resets = 0, cleared = false;
  const status = { textContent: '', classList: { remove() {}, add() {} } };
  const button = { disabled: false };
  const form = {
    action: 'https://example.test/contact',
    querySelector: key => key === '#contact-form-status' ? status : button,
    addEventListener(key, fn) { submit = fn; },
    checkValidity: () => true,
    reset() { resets++; },
  };
  const source = fs.readFileSync('main.js', 'utf8');
  vm.runInNewContext(source.slice(source.indexOf('function initializeContactForm()'),
    source.indexOf('function initializePageTransitions()')) + '\ninitializeContactForm();', {
    document: { querySelector: () => form },
    window: { setTimeout(fn) { timeout = fn; return 1; }, clearTimeout() { cleared = true; } },
    FormData: class {}, AbortController, fetch: fetchImpl,
  });
  return {
    send: () => submit({ preventDefault() {} }),
    expire: () => timeout(), status, button,
    resets: () => resets, cleared: () => cleared,
  };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('contact form clears fields only after explicit success', async () => {
  const ui = setup(async () => ({ ok: true, json: async () => ({ success: 'true' }) }));
  ui.send();
  assert.equal(ui.button.disabled, true);
  await settle();
  assert.equal(ui.resets(), 1);
  assert.equal(ui.button.disabled, false);
  assert.equal(ui.cleared(), true);
});

test('unconfirmed responses preserve the message and report failure', async () => {
  for (const data of [{}, null, { success: false }]) {
    const ui = setup(async () => ({ ok: true, json: async () => data }));
    ui.send();
    await settle();
    assert.equal(ui.resets(), 0);
    assert.match(ui.status.textContent, /Something went wrong/);
    assert.equal(ui.button.disabled, false);
  }
});

test('timeout aborts stalled requests, prevents duplicates, and allows a retry', async () => {
  let requests = 0;
  const ui = setup((url, { signal }) => {
    requests++;
    return new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')));
    });
  });
  ui.send();
  ui.send();
  assert.equal(requests, 1);
  ui.expire();
  await settle();
  assert.equal(ui.button.disabled, false);
  assert.equal(ui.resets(), 0);
  ui.send();
  assert.equal(requests, 2);
  ui.expire();
  await settle();
});
