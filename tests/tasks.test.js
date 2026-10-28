const { test } = require('node:test');
const assert = require('node:assert/strict');
let group;
try {
  group = require('../src/domain/task-groups.ts').groupPendingTasks;
} catch {}
const task = (id, due, status = 'pending') => ({
  id,
  plantId: 'p',
  type: '浇水',
  due,
  repeat: 3,
  status,
});
test('按本地日期边界区分逾期、今天与之后，排除完成历史', () => {
  assert.equal(typeof group, 'function');
  const input = [
    task('future', '2026-10-29'),
    task('today', '2026-10-28'),
    task('old', '2026-10-27'),
    task('done', '2026-10-20', 'done'),
  ];
  const before = JSON.stringify(input);
  const groups = group(input, '2026-10-28');
  assert.deepEqual(
    groups.map((g) => [g.key, g.tasks.map((t) => t.id)]),
    [
      ['overdue', ['old']],
      ['today', ['today']],
      ['upcoming', ['future']],
    ],
  );
  assert.equal(JSON.stringify(input), before);
});
test('跨年分组、空组隐藏和同组日期排序', () => {
  const groups = group(
    [task('later', '2027-01-05'), task('yearend', '2026-12-31'), task('soon', '2027-01-02')],
    '2027-01-01',
  );
  assert.deepEqual(
    groups.map((g) => g.key),
    ['overdue', 'upcoming'],
  );
  assert.deepEqual(
    groups[1].tasks.map((t) => t.id),
    ['soon', 'later'],
  );
  assert.deepEqual(group([], '2027-01-01'), []);
});
