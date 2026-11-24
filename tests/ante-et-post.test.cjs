const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { pathToFileURL, fileURLToPath } = require('node:url');
const path = require('node:path');
const imageSources = vm.runInNewContext(
  fs.readFileSync('js/antiquarium/experiences/ante-et-post-images.js', 'utf8')
    .replace('export const imageSources', 'const imageSources') + '\nimageSources;'
);

async function collection() {
  return (await import(pathToFileURL(path.resolve('js/antiquarium/experiences/ante-et-post-data.js')).href)).comparisons;
}

const settle = () => new Promise(resolve => setImmediate(resolve));

function gallery(comparisons, decode = () => Promise.resolve()) {
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
    replaceWith(next) {
      for (const [selector, node] of nodes) if (node === this) nodes.set(selector, next);
    }
    addEventListener(type, fn, { signal }) {
      this.handlers[type] = fn;
      signal.addEventListener('abort', () => { delete this.handlers[type]; }, { once: true });
    }
    querySelector() { return this.small ||= new Element(); }
    decode() { return decode(this); }
  }
  const nodes = new Map();
  const find = selector => {
    if (!nodes.has(selector)) nodes.set(selector, new Element());
    return nodes.get(selector);
  };
  const reveal = new Element(), side = new Element();
  reveal.dataset.view = 'slider'; side.dataset.view = 'side';
  const container = new Element();
  find('[data-comparison]').hidden = true;
  container.querySelector = find;
  container.querySelectorAll = () => [reveal, side];
  let source = fs.readFileSync('js/antiquarium/experiences/ante-et-post.js', 'utf8')
    .replace(/^import .*;$/gm, '')
    .replace('export default function', 'function');
  source += '\ncreateAnteEtPost(container);';
  const instance = vm.runInNewContext(source, {
    comparisons, imageSources, URL, container, AbortController, document: { createElement: () => new Element() },
  });
  return { find, side, reveal, instance };
}

test('all 42 exhibited images belong to complete artwork families without duplicate assignments', async () => {
  const comparisons = await collection();
  assert.equal(comparisons.length, 16);
  assert.equal(comparisons.reduce((n, item) => n + item.variants.length, 0), 25);
  const originals = comparisons.map(item => item.original);
  const versions = comparisons.flatMap(item => item.variants.map(version => version.image));
  const studies = comparisons.flatMap(item => (item.originalStudies || []).map(study => study.image));
  assert.equal(studies.length, 1);
  assert.equal(new Set([...originals, ...versions, ...studies]).size, 42);
  for (const url of [...originals, ...versions, ...studies, ...comparisons.map(item => item.thumbnail)]) {
    assert.ok(fs.existsSync(fileURLToPath(url)), `Missing gallery asset: ${url}`);
  }
});

test('Karl Marx keeps the flat Illustrator original and only its two AI interpretations', async () => {
  const comparisons = await collection();
  const marx = comparisons.find(item => item.id === 'karl-marx');
  assert.ok(marx.original.endsWith('/marx-original.webp'));
  assert.deepEqual(marx.variants.map(item => item.id), ['marx-monochrome', 'marx-bauhaus']);
  const { find } = gallery(comparisons);
  const index = comparisons.indexOf(marx);
  for (let i = 0; i < index; i++) find('[data-next]').handlers.click();
  await settle();
  assert.equal(find('#ante-version').children.length, 2);
  assert.ok(find('[data-after]').src.endsWith('/marx-monochrome.webp'));
});

test('Oscar Wilde keeps Adobe 3D, traditional studies and textile AI credits distinct', async () => {
  const comparisons = await collection();
  const { find } = gallery(comparisons);
  const oscarIndex = comparisons.findIndex(item => item.id === 'oscar-wilde');
  for (let i = 0; i < oscarIndex; i++) find('[data-next]').handlers.click();
  await settle();
  assert.match(find('[data-after-caption]').textContent, /Adobe 3D artwork/);
  const sourceSelect = find('#ante-original');
  assert.equal(sourceSelect.hidden, false);
  assert.equal(sourceSelect.children.length, 2);
  const ai = find('[data-after]').src;
  sourceSelect.value = '1';
  sourceSelect.handlers.change();
  await settle();
  assert.equal(find('[data-before]').src, comparisons[oscarIndex].originalStudies[0].image);
  assert.equal(find('[data-after]').src, ai);
  assert.match(find('[data-before-caption]').textContent, /Monochrome study/);
  find('[data-next]').handlers.click();
  await settle();
  assert.equal(sourceSelect.hidden, true);
  assert.equal(sourceSelect.value, '0');
});

test('changing AI interpretation keeps its original and slider position; next artwork resets versions', async () => {
  const comparisons = await collection();
  const { find, instance } = gallery(comparisons);
  await settle();
  const selector = find('#ante-version');
  assert.equal(selector.children.length, 3);
  assert.equal(find('[data-before]').src, comparisons[0].original);
  const slider = find('.ante-range');
  slider.value = '72'; slider.handlers.input();
  selector.value = '2'; selector.handlers.change();
  await settle();
  assert.equal(find('[data-before]').src, comparisons[0].original);
  assert.equal(find('[data-after]').src, comparisons[0].variants[2].image);
  assert.equal(slider.value, '72');
  assert.equal(find('[data-version-count]').textContent, '3 / 3');
  find('[data-next]').handlers.click();
  await settle();
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

test('the first comparison appears only when both images are decoded; no silhouette markup remains', async () => {
  const pending = [];
  const { find } = gallery(await collection(), () => new Promise(resolve => pending.push(resolve)));
  assert.equal(find('[data-comparison]').hidden, true);
  pending[0]();
  await settle();
  assert.equal(find('[data-comparison]').hidden, true);
  pending[1]();
  await settle();
  assert.equal(find('[data-comparison]').hidden, false);
  assert.equal(find('[data-before]').hidden, false);
  assert.equal(find('[data-after]').hidden, false);
  assert.doesNotMatch(fs.readFileSync('js/antiquarium/experiences/ante-et-post.js', 'utf8'), /ante-placeholder/);
  assert.doesNotMatch(fs.readFileSync('css/antiquarium.css', 'utf8'), /ante-placeholder/);
});

test('responsive image candidates exist and adapt to comparison mode', async () => {
  const comparisons = await collection();
  const displayed = comparisons.flatMap(item => [item.original, ...item.variants.map(v => v.image), ...(item.originalStudies || []).map(s => s.image)]);
  for (const url of displayed) {
    const filename = path.basename(fileURLToPath(url));
    const sources = imageSources[filename];
    assert.ok(sources?.length, `Missing responsive sizes for ${filename}`);
    let previousWidth = 0;
    for (const source of sources) {
      assert.ok(source.width > previousWidth, `Unsorted widths for ${filename}`);
      assert.ok(fs.existsSync(fileURLToPath(new URL(source.url, url))));
      previousWidth = source.width;
    }
  }
  const { find, side, reveal } = gallery(comparisons);
  await settle();
  assert.match(find('[data-before]').srcset, /-w640\.webp 640w/);
  const revealSizes = find('[data-before]').sizes;
  side.handlers.click();
  await settle();
  assert.notEqual(find('[data-before]').sizes, revealSizes);
  assert.equal(find('[data-before]').sizes, find('[data-after]').sizes);
  assert.equal(find('[data-reveal-labels]').hidden, true);
  reveal.handlers.click();
  await settle();
  assert.equal(find('[data-before]').sizes, revealSizes);
  assert.equal(find('[data-reveal-labels]').hidden, false);
});

test('changing a version keeps both decoded artworks visible without a loading flash', async () => {
  const { find } = gallery(await collection());
  await new Promise(resolve => setImmediate(resolve));
  const original = find('[data-before]');
  const src = original.src;
  const selector = find('#ante-version');
  selector.value = '1';
  selector.handlers.change();
  assert.equal(original.src, src);
  assert.equal(original.hidden, false);
  assert.equal(find('[data-after]').hidden, false);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(find('[data-after]').hidden, false);
  assert.equal(find('[data-comparison]').attributes['aria-busy'], 'false');
});

test('slow pair loading is atomic and rapid clicks cannot restore an earlier selection', async () => {
  const comparisons = await collection();
  const pending = new Map();
  const { find } = gallery(comparisons, image => {
    if (image.src.includes('median-pathfinder') || image.src.includes('parthian-circle')) {
      return new Promise(resolve => pending.set(image.src, resolve));
    }
    return Promise.resolve();
  });
  await settle();
  const original = find('[data-before]');
  const version = find('[data-after]');
  find('[data-next]').handlers.click();
  assert.equal(find('[data-before]'), original);
  assert.equal(find('[data-after]'), version);
  pending.get(comparisons[1].original)();
  await settle();
  assert.equal(find('[data-before]'), original);
  assert.equal(find('[data-after]'), version);
  find('[data-next]').handlers.click();
  pending.get(comparisons[2].original)();
  pending.get(comparisons[2].variants[0].image)();
  await settle();
  assert.equal(find('[data-title]').textContent, comparisons[2].title);
  pending.get(comparisons[1].variants[0].image)();
  await settle();
  assert.equal(find('[data-title]').textContent, comparisons[2].title);
  assert.equal(find('[data-before]').src, comparisons[2].original);
});

test('failed images retain the last complete pair and retry can recover', async () => {
  const comparisons = await collection();
  let fail = true;
  const { find } = gallery(comparisons, image =>
    fail && image.src.includes('median-pathfinder') ? Promise.reject(new Error('offline')) : Promise.resolve());
  await settle();
  const before = find('[data-before]');
  const after = find('[data-after]');
  find('[data-next]').handlers.click();
  await settle();
  assert.equal(find('[data-before]'), before);
  assert.equal(find('[data-after]'), after);
  assert.equal(before.hidden, false);
  assert.equal(after.hidden, false);
  assert.equal(find('.ante-error').hidden, false);
  assert.equal(find('[data-comparison]').attributes['aria-busy'], 'false');
  fail = false;
  find('[data-retry]').handlers.click();
  await settle();
  assert.equal(find('[data-before]').src, comparisons[1].original);
  assert.equal(find('.ante-error').hidden, true);
});

test('decoding after disposal never inserts artwork into the removed gallery', async () => {
  const pending = [];
  const { find, instance } = gallery(await collection(), () => new Promise(resolve => pending.push(resolve)));
  instance.dispose();
  pending.forEach(resolve => resolve());
  await settle();
  assert.equal(find('[data-comparison]').hidden, true);
});
