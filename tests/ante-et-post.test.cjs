const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { pathToFileURL, fileURLToPath } = require('node:url');
const path = require('node:path');

async function collection() {
  return (await import(pathToFileURL(path.resolve('js/antiquarium/experiences/ante-et-post-data.js')).href)).comparisons;
}

function gallery(comparisons) {
  class Element {
    constructor() {
      this.children = []; this.attributes = {}; this.handlers = {};
      this.dataset = {}; this.value = ''; this.hidden = false;
      this.classes = new Set();
      this.classList = { toggle: (name, on) => on ? this.classes.add(name) : this.classes.delete(name) };
      this.style = { setProperty: (name, value) => { this.attributes[name] = value; } };
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this[name]; }
    append(child) { this.children.push(child); }
    replaceChildren() { this.children = []; }
    addEventListener(type, fn, { signal }) {
      this.handlers[type] = fn;
      signal.addEventListener('abort', () => { delete this.handlers[type]; }, { once: true });
    }
    decode() { return Promise.resolve(); }
  }
  const nodes = new Map();
  const find = selector => {
    if (!nodes.has(selector)) nodes.set(selector, new Element());
    return nodes.get(selector);
  };
  const reveal = new Element(), side = new Element();
  reveal.dataset.view = 'slider'; side.dataset.view = 'side';
  const container = new Element();
  container.querySelector = find;
  container.querySelectorAll = () => [reveal, side];
  let source = fs.readFileSync('js/antiquarium/experiences/ante-et-post.js', 'utf8')
    .replace(/^import .*;$/m, '')
    .replace('export default function', 'function');
  source += '\ncreateAnteEtPost(container);';
  const instance = vm.runInNewContext(source, {
    comparisons, container, AbortController, document: { createElement: () => new Element() },
  });
  return { find, side, reveal, instance };
}

test('all 17 supplied artworks belong to seven complete original/AI groups', async () => {
  const comparisons = await collection();
  assert.equal(comparisons.length, 7);
  assert.equal(comparisons.reduce((n, item) => n + item.variants.length, 0), 10);
  const originals = comparisons.map(item => item.original);
  const versions = comparisons.flatMap(item => item.variants.map(version => version.image));
  assert.equal(new Set([...originals, ...versions]).size, 17);
  for (const url of [...originals, ...versions, ...comparisons.map(item => item.thumbnail)]) {
    assert.ok(fs.existsSync(fileURLToPath(url)), `Missing gallery asset: ${url}`);
  }
});

test('changing AI interpretation keeps its original and slider position; next artwork resets versions', async () => {
  const comparisons = await collection();
  const { find, instance } = gallery(comparisons);
  const selector = find('#ante-version');
  assert.equal(selector.children.length, 3);
  assert.equal(find('[data-before]').src, comparisons[0].original);
  const slider = find('.ante-range');
  slider.value = '72'; slider.handlers.input();
  selector.value = '2'; selector.handlers.change();
  await Promise.resolve();
  assert.equal(find('[data-before]').src, comparisons[0].original);
  assert.equal(find('[data-after]').src, comparisons[0].variants[2].image);
  assert.equal(slider.value, '72');
  assert.equal(find('[data-version-count]').textContent, '3 / 3');
  find('[data-next]').handlers.click();
  assert.equal(selector.children.length, 2);
  assert.equal(selector.value, '0');
  assert.equal(slider.value, '50');
  assert.equal(find('[data-before]').src, comparisons[1].original);
  find('[data-next]').handlers.click();
  assert.equal(selector.disabled, true);
  instance.dispose();
  assert.equal(selector.handlers.change, undefined);
});

test('side-by-side mode persists when navigating through the collection', async () => {
  const { find, side, reveal } = gallery(await collection());
  side.handlers.click();
  find('[data-next]').handlers.click();
  assert.ok(find('[data-comparison]').classes.has('is-side-by-side'));
  assert.equal(find('.ante-range').hidden, true);
  reveal.handlers.click();
  assert.equal(find('.ante-range').hidden, false);
  assert.ok(!find('[data-comparison]').classes.has('is-side-by-side'));
});

test('loading labels disappear after decoding and return only while the next pair loads', async () => {
  const { find } = gallery(await collection());
  const beforePlaceholder = find('[data-before-placeholder]');
  const afterPlaceholder = find('[data-after-placeholder]');
  assert.equal(beforePlaceholder.hidden, false);
  assert.equal(afterPlaceholder.hidden, false);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(beforePlaceholder.hidden, true);
  assert.equal(afterPlaceholder.hidden, true);
  assert.equal(find('[data-before]').hidden, false);
  assert.equal(find('[data-after]').hidden, false);
  find('[data-next]').handlers.click();
  assert.equal(beforePlaceholder.hidden, false);
  assert.equal(afterPlaceholder.hidden, false);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(beforePlaceholder.hidden, true);
  assert.equal(afterPlaceholder.hidden, true);
});
