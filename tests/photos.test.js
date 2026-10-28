const { test } = require('node:test');
const assert = require('node:assert/strict');
let geometry;
let viewport;
try {
  geometry = require('../src/domain/photos.ts').spriteGeometry;
  viewport = require('../src/domain/photos.ts').updatePhotoViewport;
} catch {}
test('横向封面里的拼图保持正方形，裁剪上下而非拉伸', () => {
  assert.equal(typeof geometry, 'function');
  const g = geometry(360, 200, 1, 0, 'cover');
  assert.equal(g.image.width, 720);
  assert.equal(g.image.height, 720);
  assert.equal(g.image.left, -360);
  assert.equal(g.window.top, -80);
});
test('双指缩放会同步实际比例，复原和切图重建视图', () => {
  assert.equal(typeof viewport, 'function');
  let state = { index: 0, scale: 1, requestedScale: 1, revision: 0 };
  state = viewport(state, { type: 'scale', index: 0, value: 2.75 });
  assert.equal(state.scale, 2.75);
  assert.equal(state.requestedScale, 1);
  state = viewport(state, { type: 'reset' });
  assert.equal(state.scale, 1);
  assert.equal(state.revision, 1);
  state = viewport(state, { type: 'scale', index: 0, value: 3 });
  state = viewport(state, { type: 'enlarge' });
  assert.equal(state.scale, 4);
  assert.equal(state.requestedScale, 4);
  state = viewport(state, { type: 'change', index: 1 });
  assert.equal(state.scale, 1);
  assert.equal(state.index, 1);
  assert.equal(state.revision, 2);
  assert.equal(viewport(state, { type: 'scale', index: 0, value: 3 }), state);
});
test('竖向卡片裁剪左右，预览模式则完整容纳照片', () => {
  const cover = geometry(160, 220, 0, 1, 'cover');
  assert.deepEqual(cover.window, { width: 220, height: 220, left: -30, top: 0 });
  assert.equal(cover.image.top, -220);
  const contain = geometry(300, 600, 1, 1, 'contain');
  assert.deepEqual(contain.window, { width: 300, height: 300, left: 0, top: 150 });
  assert.equal(contain.image.top, -300);
});
test('放大后手势缩回原图，再次放大仍会发出新的比例变化', () => {
  let state = { index: 0, scale: 1, requestedScale: 1, revision: 0 };
  state = viewport(state, { type: 'enlarge' });
  state = viewport(state, { type: 'scale', index: 0, value: 1 });
  state = viewport(state, { type: 'prepare-enlarge' });
  assert.equal(state.requestedScale, 1);
  assert.equal(state.revision, 0);
  state = viewport(state, { type: 'enlarge' });
  assert.equal(state.requestedScale, 2);
  assert.equal(state.scale, 2);
  assert.equal(state.revision, 0);
});
