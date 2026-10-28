const { test } = require('node:test');
const assert = require('node:assert/strict');
let P = {};
try {
  P = require('../src/domain/poster-layout.ts');
} catch {}
const entry = (text, photos = []) => ({
  id: 'e',
  plantId: 'p',
  date: '2026-10-28',
  title: '今天的新变化',
  text,
  photos,
  stage: '长叶',
  kind: 'diary',
});
test('短记录收紧间距，长记录增加高度且后一条紧随内容之后', () => {
  assert.equal(typeof P.createPosterLayout, 'function');
  const p = P.createPosterLayout([
    entry('又长出一片叶子。'),
    entry('每天都能看见新的变化。'.repeat(12)),
  ]);
  assert.ok(p.rows[0].height < 330);
  assert.ok(p.rows[1].height > p.rows[0].height);
  assert.equal(p.rows[1].y, p.rows[0].y + p.rows[0].height);
  assert.equal(p.height, p.rows[1].y + p.rows[1].height + 110);
});
test('照片和文字都落在行高以内，十二条长记录不会超出常用画布高度', () => {
  const p = P.createPosterLayout(
    Array.from({ length: 12 }, () =>
      entry('新的叶片慢慢展开，窗台上都是阳光。'.repeat(20), ['photo.jpg']),
    ),
  );
  for (const r of p.rows) {
    assert.ok(r.image.y + r.image.height <= r.y + r.height - 44);
    assert.ok(r.textY + (r.textLines.length - 1) * 32 + 8 <= r.y + r.height - 44);
    assert.ok(r.textLines.length <= 8);
  }
  assert.ok(p.height < 8192);
  assert.ok(p.rows[0].textLines.at(-1).endsWith('…'));
});
test('按宽度换行并保留完整Unicode字符，长标题明确显示省略', () => {
  assert.deepEqual(P.wrapPosterText('春天的新叶', 44, 22, 5), ['春天', '的新', '叶']);
  assert.equal(P.wrapPosterText('𠮷叶', 44, 22, 5).join(''), '𠮷叶');
  const e = entry('');
  e.title = '很长很长的成长标题'.repeat(12);
  const r = P.createPosterLayout([e]).rows[0];
  assert.equal(r.titleLines.length, 2);
  assert.ok(r.titleLines[1].endsWith('…'));
});
