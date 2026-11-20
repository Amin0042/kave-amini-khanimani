const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require("node:path").join(__dirname, "../js/emblem-lighting.js"), "utf8");

function setup({ reduced = false, fine = false } = {}) {
  const events = new Map();
  const element = () => ({
    attributes: {}, textContent: "", hidden: true,
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(key, fn) { this[key] = fn; },
  });
  const lights = [element(), element()], point = element(), emblem = element();
  emblem.querySelectorAll = () => lights;
  emblem.querySelector = () => point;
  emblem.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200 });
  const nodes = { "[data-motion-emblem]": emblem };
  const media = { matches: reduced, addEventListener(_, fn) { this.change = fn; } };
  let nextFrame = 0;
  const frames = new Map();
  const document = { hidden: false, querySelector: key => nodes[key], addEventListener(key, fn) { this[key] = fn; } };
  const window = {
    matchMedia: query => query.includes("reduced-motion") ? media : { matches: fine, addEventListener() {} },
    addEventListener(key, fn) { events.set(key, fn); },
    removeEventListener(key) { events.delete(key); },
    requestAnimationFrame(fn) { frames.set(++nextFrame, fn); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); },
  };
  vm.runInNewContext(source, { window, document });
  return {
    lights, point, media, window, document, events, emblem,
    flush() {
      for (let i = 0; frames.size && i < 100; i++) {
        const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn());
      }
      assert.equal(frames.size, 0, "lighting settles instead of running endlessly");
    },
  };
}

test("desktop pointer lighting works without sensor access", () => {
  const app = setup({ fine: true });
  app.emblem.pointermove({ clientX: 175, clientY: 100, pointerType: "mouse" });
  app.flush();
  assert.ok(Number(app.lights[0].attributes.azimuth) > 260);
  app.emblem.pointerleave(); app.flush();
  assert.ok(Math.abs(Number(app.lights[0].attributes.azimuth) - 225) < 0.2);
});


test("touch input keeps default lighting and registers no sensor listeners", () => {
  const app = setup();
  app.emblem.pointermove({ clientX: 175, clientY: 100, pointerType: "touch" });
  app.flush();
  assert.equal(app.lights[0].attributes.azimuth, "225.00");
  assert.equal(app.events.size, 0);
});

test("reduced motion resets active pointer lighting and prevents further changes", () => {
  const app = setup({ fine: true });
  app.emblem.pointermove({ clientX: 175, clientY: 100, pointerType: "mouse" });
  app.flush();
  assert.ok(Number(app.lights[0].attributes.azimuth) > 260);
  app.media.matches = true;
  app.media.change();
  app.emblem.pointermove({ clientX: 175, clientY: 100, pointerType: "mouse" });
  app.flush();
  assert.equal(app.lights[0].attributes.azimuth, "225.00");
});

test("hidden pages reset lighting and ignore pointer movement", () => {
  const app = setup({ fine: true });
  app.emblem.pointermove({ clientX: 175, clientY: 100, pointerType: "mouse" });
  app.flush();
  app.document.hidden = true;
  app.document.visibilitychange();
  app.emblem.pointermove({ clientX: 175, clientY: 100, pointerType: "mouse" });
  app.flush();
  assert.equal(app.lights[0].attributes.azimuth, "225.00");
});
