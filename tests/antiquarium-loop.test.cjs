const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('watchdog receives actual elapsed time while animation remains capped; stop during tick schedules no extra frame', () => {
  let scheduled, count = 0, values;
  const context = vm.createContext({
    performance: { now: () => 0 },
    window: {
      requestAnimationFrame(fn) { scheduled = fn; count++; return count; },
      cancelAnimationFrame() {},
    },
  });
  vm.runInContext(fs.readFileSync('js/antiquarium/core/loop.js', 'utf8').replace('export function', 'function'), context);
  const loop = context.createLoop((...args) => { values = args; loop.stop(); });
  loop.start();
  scheduled(500);
  assert.equal(values[0], 0.1);
  assert.equal(values[2], 0.5);
  assert.equal(loop.isRunning, false);
  assert.equal(count, 1);
});
