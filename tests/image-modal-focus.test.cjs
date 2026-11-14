const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('artwork modal focuses its close control, isolates background, and restores focus and inert state', () => {
  const classList = () => ({ add() {}, remove() {}, toggle() {} });
  const element = () => ({
    classList: classList(), style: {}, textContent: '',
    setAttribute() {}, removeAttribute() {},
  });
  const background = { inert: false }, alreadyInert = { inert: true };
  let focus = 'artwork';
  const trigger = { isConnected: true, focus() { focus = 'artwork'; } };
  const imageModal = {
    modal: element(), image: element(), title: element(), description: element(),
    imageWrap: element(), closeButton: { focus() { focus = 'close'; } },
  };
  const document = {
    activeElement: trigger,
    body: { classList: classList(), children: [background, alreadyInert, imageModal.modal] },
    documentElement: { classList: classList() }, getElementById() { return null; },
  };
  const source = fs.readFileSync('main.js', 'utf8');
  const start = source.indexOf('  let imageModalTrigger = null;');
  const end = source.indexOf('  imageModal.closeButton.addEventListener', start);
  const context = vm.createContext({
    document, imageModal, defaultImageModalDescription: '', imageModalDrag: null,
    resetImageModalZoom() {}, typesetText(el, value) { el.textContent = value; },
  });
  vm.runInContext(source.slice(start, end), context);
  context.openImageModal({ alt: 'Artwork', dataset: {}, src: 'art.webp', closest() { return null; } });
  assert.equal(focus, 'close');
  assert.equal(background.inert, true);
  assert.equal(imageModal.modal.inert, undefined);
  context.closeImageModal();
  assert.equal(focus, 'artwork');
  assert.equal(background.inert, false);
  assert.equal(alreadyInert.inert, true);
});
