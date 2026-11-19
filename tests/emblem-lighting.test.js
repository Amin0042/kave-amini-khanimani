const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require("node:path").join(__dirname, "../js/emblem-lighting.js"), "utf8");

function setup({ permission = "granted", reduced = false, secure = true, supported = true, fine = false } = {}) {
  const events = new Map();
  const element = () => ({
    attributes: {}, textContent: "", hidden: true,
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(key, fn) { this[key] = fn; },
  });
  const button = element(), controls = element(), status = element();
  const lights = [element(), element()], point = element(), emblem = element();
  emblem.querySelectorAll = () => lights;
  emblem.querySelector = () => point;
  emblem.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200 });
  const nodes = {
    "[data-motion-emblem]": emblem, "[data-emblem-controls]": controls,
    "[data-emblem-lighting]": button, "[data-emblem-status]": status,
  };
  const media = { matches: reduced, addEventListener(_, fn) { this.change = fn; } };
  let requests = 0, nextFrame = 0;
  const frames = new Map(), timers = new Map();
  const document = { hidden: false, querySelector: key => nodes[key], addEventListener(key, fn) { this[key] = fn; } };
  const window = {
    isSecureContext: secure,
    matchMedia: query => query.includes("reduced-motion") ? media : { matches: fine, addEventListener() {} },
    screen: { orientation: { angle: 0, addEventListener() {} } },
    DeviceOrientationEvent: supported ? { requestPermission() { requests++; return Promise.resolve(permission); } } : undefined,
    addEventListener(key, fn) { events.set(key, fn); },
    removeEventListener(key) { events.delete(key); },
    requestAnimationFrame(fn) { frames.set(++nextFrame, fn); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout(fn) { timers.set(1, fn); return 1; },
  };
  vm.runInNewContext(source, { window, document, clearTimeout: id => timers.delete(id) });
  return {
    button, controls, status, lights, point, media, window, document, events, timers, emblem,
    requests: () => requests,
    orient: (beta, gamma) => events.get("deviceorientation")?.({ beta, gamma }),
    flush() {
      for (let i = 0; frames.size && i < 100; i++) {
        const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn());
      }
      assert.equal(frames.size, 0, "lighting settles instead of running endlessly");
    },
  };
}

test("sensor permission is requested only after a tap; calibration follows the starting posture", async () => {
  const app = setup();
  assert.equal(app.controls.hidden, false);
  assert.equal(app.requests(), 0);
  await app.button.click();
  assert.equal(app.requests(), 1);
  app.orient(60, 10); app.flush();
  assert.equal(app.lights[0].attributes.azimuth, "225.00");
  app.orient(74, 24); app.flush();
  assert.ok(Number(app.lights[0].attributes.azimuth) > 248);
  assert.ok(Number(app.lights[0].attributes.elevation) > 64);
  assert.equal(app.timers.size, 0);
  await app.button.click();
  assert.equal(app.events.has("deviceorientation"), false);
  assert.equal(app.lights[0].attributes.azimuth, "225.00");
  assert.equal(app.button.attributes["aria-pressed"], "false");
});

test("denied permission preserves default lighting and allows retry", async () => {
  const app = setup({ permission: "denied" });
  await app.button.click();
  assert.equal(app.events.has("deviceorientation"), false);
  assert.match(app.status.textContent, /Default lighting/);
  assert.equal(app.button.disabled, false);
});

test("reduced motion, insecure contexts and missing sensors hide tilt controls", () => {
  for (const options of [{ reduced: true }, { secure: false }, { supported: false }]) {
    assert.equal(setup(options).controls.hidden, true);
  }
});

test("null sensor values time out gracefully", async () => {
  const app = setup();
  await app.button.click();
  app.orient(null, null);
  assert.equal(app.timers.size, 1);
  app.timers.get(1)();
  assert.equal(app.events.has("deviceorientation"), false);
  assert.match(app.status.textContent, /No motion data/);
});

test("changing reduced-motion preference stops active sensor effects", async () => {
  const app = setup();
  await app.button.click();
  app.media.matches = true; app.media.change();
  assert.equal(app.events.has("deviceorientation"), false);
  assert.equal(app.controls.hidden, true);
});

test("landscape tilt maps to screen coordinates and hidden pages do not relight", async () => {
  const app = setup();
  await app.button.click();
  app.window.screen.orientation.angle = 90;
  app.orient(60, 0); app.flush();
  app.orient(74, 0); app.flush();
  assert.ok(Number(app.lights[0].attributes.azimuth) > 248);
  app.document.hidden = true; app.document.visibilitychange();
  app.orient(85, 0); app.flush();
  assert.equal(app.lights[0].attributes.azimuth, "225.00");
});

test("desktop pointer lighting works without sensor access", () => {
  const app = setup({ fine: true, supported: false });
  app.emblem.pointermove({ clientX: 175, clientY: 100, pointerType: "mouse" });
  app.flush();
  assert.ok(Number(app.lights[0].attributes.azimuth) > 260);
  app.emblem.pointerleave(); app.flush();
  assert.ok(Math.abs(Number(app.lights[0].attributes.azimuth) - 225) < 0.2);
});
