const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(entries, { webgl = true } = {}) {
  const handlers = {};
  const buttons = [];
  const element = () => ({
    hidden: false, attributes: {}, children: [],
    classList: { add() {}, toggle() {} },
    setAttribute(key, value) { this.attributes[key] = value; },
    appendChild(child) { this.children.push(child); },
    addEventListener(key, fn) { if (key === 'click') this.click = fn; },
  });
  const stageEl = element(), fallback = element(), caption = element();
  const gallery = element(), reset = element();
  gallery.parentElement = element();
  gallery.hidden = true;
  fallback.hidden = true;
  const selector = element();
  selector.querySelectorAll = () => buttons;
  selector.querySelector = () => null;
  selector.appendChild = button => buttons.push(button);
  const stage = { scene: {}, camera: {}, renderer: { render() {} }, resize() {}, dispose() {} };
  const loop = { start() {}, stop() {} };
  const document = {
    readyState: 'complete', visibilityState: 'visible',
    querySelector: key => ({
      '[data-antiquarium-stage]': stageEl,
      '[data-antiquarium-fallback]': fallback,
      '[data-antiquarium-selector]': selector,
      '[data-antiquarium-caption]': caption,
      '[data-antiquarium-gallery]': gallery,
      '[data-antiquarium-reset]': reset,
    })[key] || null,
    createElement() { const el = element(); el.dataset = {}; return el; },
    addEventListener(key, fn) { handlers[key] = fn; },
  };
  let source = fs.readFileSync('js/antiquarium/main.js', 'utf8')
    .replace(/^import .*;$/gm, '')
    .replace('import("./core/renderer.js")', 'Promise.resolve({ createStage: () => stage })');
  vm.runInNewContext(source, {
    document, stage, Promise,
    window: { matchMedia: () => ({ matches: false }), addEventListener(key, fn) { handlers[key] = fn; } },
    isWebglAvailable: () => webgl, isLikelySoftwareRenderer: () => false,
    getDeviceTier: () => 'desktop', getQualityPreset: () => ({}),
    createLoop: () => loop, experiences: entries, getDefaultExperience: () => entries[0],
    ResizeObserver: class { observe() {} disconnect() {} }, performance,
  });
  return { buttons, stageEl, fallback, caption, handlers, gallery, reset };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('failed installation loading shows fallback and clears busy state', async () => {
  const ui = setup([{ id: 'broken', status: 'active', load: () => Promise.reject(new Error('offline')) }]);
  await settle();
  assert.equal(ui.fallback.hidden, false);
  assert.equal(ui.stageEl.hidden, true);
  assert.equal(ui.stageEl.attributes['aria-busy'], 'false');
  assert.match(ui.caption.textContent, /could not load/);
});

test('DOM gallery stays selectable without WebGL and mounts in the same page', async () => {
  let target;
  const ui = setup([
    { id: '3d', status: 'active', load: async () => { throw new Error('3D must not load'); } },
    { id: 'gallery', status: 'active', renderMode: 'dom', load: async () => ({ default: el => {
      target = el;
      return { dispose() {} };
    } }) },
  ], { webgl: false });
  assert.equal(ui.buttons[0].disabled, true);
  assert.ok(!ui.buttons[1].disabled);
  ui.buttons[1].click();
  await settle();
  assert.equal(target, ui.gallery);
  assert.equal(ui.gallery.hidden, false);
  assert.equal(ui.stageEl.hidden, true);
  assert.equal(ui.fallback.hidden, true);
  assert.equal(ui.reset.hidden, true);
  assert.equal(ui.buttons[1].attributes['aria-pressed'], 'true');
});

test('switching from gallery back to 3D disposes gallery and restores stage controls', async () => {
  let galleryDisposed = 0;
  const ui = setup([
    { id: '3d', status: 'active', load: async () => ({ default: () => ({ update() {}, dispose() {} }) }) },
    { id: 'gallery', status: 'active', renderMode: 'dom', load: async () => ({ default: () => ({ dispose() { galleryDisposed++; } }) }) },
  ]);
  await settle();
  ui.buttons[1].click();
  await settle();
  ui.buttons[0].click();
  await settle();
  assert.equal(galleryDisposed, 1);
  assert.equal(ui.gallery.hidden, true);
  assert.equal(ui.stageEl.hidden, false);
  assert.equal(ui.reset.hidden, false);
  assert.equal(ui.buttons[0].attributes['aria-pressed'], 'true');
});

test('a late 3D import cannot replace a newly selected DOM gallery', async () => {
  let resolveScene;
  let sceneMounted = false;
  const ui = setup([
    { id: '3d', status: 'active', load: () => new Promise(resolve => { resolveScene = resolve; }) },
    { id: 'gallery', status: 'active', renderMode: 'dom', load: async () => ({ default: () => ({ dispose() {} }) }) },
  ]);
  await settle();
  ui.buttons[1].click();
  await settle();
  resolveScene({ default: () => { sceneMounted = true; } });
  await settle();
  assert.equal(sceneMounted, false);
  assert.equal(ui.gallery.hidden, false);
  assert.equal(ui.buttons[1].attributes['aria-pressed'], 'true');
});

test('latest installation wins when earlier loading finishes last', async () => {
  let resolveFirst;
  const mounted = [];
  const factory = id => ({ default: () => {
    mounted.push(id);
    return { update() {}, dispose() {} };
  } });
  const ui = setup([
    { id: 'first', status: 'active', load: () => new Promise(resolve => { resolveFirst = resolve; }) },
    { id: 'second', status: 'active', load: async () => factory('second') },
  ]);
  await settle();
  ui.buttons[1].click();
  await settle();
  resolveFirst(factory('first'));
  await settle();
  assert.deepEqual(mounted, ['second']);
  assert.equal(ui.buttons[1].attributes['aria-pressed'], 'true');
  assert.equal(ui.buttons[0].attributes['aria-pressed'], 'false');
});
