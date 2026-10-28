const { test } = require('node:test');
const assert = require('node:assert/strict');
let M;
try { M = require('../src/domain/model.ts'); } catch { M = {}; }
const fresh = () => M.createStore({ read: () => null, write: () => {}, today: () => '2026-10-27' });
test('种植天数按本地日历计算且当天为第一天', () => {
  assert.equal(typeof M.daysSince, 'function');
  assert.equal(M.daysSince('2026-10-01', '2026-10-27'), 27);
  assert.equal(M.daysSince('2026-10-27', '2026-10-27'), 1);
});
test('植物档案拒绝空名称和未来日期', () => {
  assert.equal(typeof M.createStore, 'function');
  const s = fresh();
  assert.throws(() => s.addPlant({ name: ' ', date: '2026-10-01' }), /名称/);
  assert.throws(() => s.addPlant({ name: '薄荷', date: '2026-10-28' }), /日期/);
});
test('新增照片日记并保留成长阶段', () => {
  const s = fresh(); const p = s.addPlant({ name: '薄荷', date: '2026-10-01' });
  const e = s.addEntry({ plantId: p.id, date: '2026-10-27', stage: '发芽', text: '长出两片叶子', photos: ['local.jpg'] });
  assert.equal(e.stage, '发芽'); assert.deepEqual(e.photos, ['local.jpg']);
  assert.throws(() => s.addEntry({ plantId: 'missing', date: '2026-10-27', text: 'x' }), /植物/);
});
test('重复任务完成保留历史并按完成日期安排下一次', () => {
  const s = fresh(); const p = s.addPlant({ name: '薄荷', date: '2026-10-01' });
  const t = s.addTask({ plantId: p.id, type: '浇水', due: '2026-10-20', repeat: 3 });
  s.completeTask(t.id);
  assert.equal(s.state.tasks.find(x => x.id === t.id).status, 'done');
  assert.equal(s.state.tasks.find(x => x.status === 'pending').due, '2026-10-30');
  assert.equal(s.state.entries.filter(x => x.kind === 'care').length, 1);
  assert.throws(() => s.completeTask(t.id), /完成/);
});
test('推迟跨月，跳过不生成日记', () => {
  const s = fresh(); const p = s.addPlant({ name: '薄荷', date: '2026-10-01' });
  const t = s.addTask({ plantId: p.id, type: '修剪', due: '2026-10-31', repeat: 0 });
  s.postpone(t.id); assert.equal(t.due, '2026-11-01');
  s.skip(t.id); assert.equal(t.status, 'skipped'); assert.equal(s.state.entries.length, 0);
});
test('存储失败回滚状态，备份导入拒绝错误结构', () => {
  const s = M.createStore({ read: () => null, write: () => { throw new Error('空间不足'); }, today: () => '2026-10-27' });
  assert.throws(() => s.addPlant({ name: '薄荷', date: '2026-10-01' }), /空间不足/);
  assert.equal(s.state.plants.length, 0);
  assert.throws(() => fresh().restore({ plants: 'bad' }), /备份/);
});
test('编辑种植日期不能晚于已有日记', () => {
  const s=fresh();const p=s.addPlant({name:'薄荷',date:'2026-10-01'});
  s.addEntry({plantId:p.id,date:'2026-10-05',text:'发芽啦'});
  assert.throws(()=>s.updatePlant(p.id,{name:'薄荷',date:'2026-10-10'}),/记录/);
  assert.equal(s.state.plants[0].date,'2026-10-01');
});
test('删除植物同时移除关联日记和任务，保留其他植物', () => {
  const s=fresh();const p=s.addPlant({name:'薄荷',date:'2026-10-01'});s.addPlant({name:'茉莉',date:'2026-10-01'});
  s.addEntry({plantId:p.id,date:'2026-10-05',text:'长叶'});s.addTask({plantId:p.id,type:'浇水',due:'2026-10-27'});
  s.deletePlant(p.id);assert.equal(s.state.plants.length,1);assert.equal(s.state.plants[0].name,'茉莉');assert.equal(s.state.entries.length,0);assert.equal(s.state.tasks.length,0);
});
test('序列化备份恢复后保留照片、成长阶段与已完成历史', () => {
  const s=fresh();s.seed();s.completeTask('t1');const backup=JSON.parse(JSON.stringify(s.state));const restored=fresh();restored.restore(backup);
  assert.deepEqual(restored.state,backup);assert.equal(restored.state.entries.find(e=>e.id==='e1').photos[0],'plant:tomato');
});
test('损坏缓存仍可导出原始内容并导入备份恢复', () => {
  assert.equal(typeof M.createRepository,'function');
  let saved=null;const r=M.createRepository({read:()=>'{损坏的缓存',write:s=>{saved=s;}});
  assert.ok(r.error);assert.throws(()=>r.run(s=>s.clear()),/读取/);
  assert.equal(r.backup(),'{损坏的缓存');
  const healthy=fresh();healthy.seed();r.recover(s=>s.restore(healthy.state));
  assert.equal(r.error,'');assert.equal(saved.plants.length,4);assert.equal(r.state.plants.length,4);
});
test('恢复写入失败时保留原始缓存保护和错误状态', () => {
  const r=M.createRepository({read:()=>'{bad',write:()=>{throw Error('空间不足');}});
  assert.throws(()=>r.recover(s=>s.clear()),/空间不足/);assert.ok(r.error);assert.equal(r.backup(),'{bad');
});
test('拒绝会破坏长图的备份字段且不覆盖当前记录', () => {
  const s=fresh();s.seed();const corrupt=JSON.parse(JSON.stringify(s.state));corrupt.entries[0].stage=null;
  assert.throws(()=>s.restore(corrupt),/记录/);assert.equal(s.state.entries[0].stage,'开花');
  corrupt.entries[0].stage='开花';corrupt.entries[0].title={};assert.throws(()=>s.restore(corrupt),/记录/);
});
test('照片回收保留封面、共享日记照片与未提交草稿', () => {
  assert.equal(typeof M.orphanPhotoPaths,'function');const s=fresh();const p=s.addPlant({name:'薄荷',date:'2026-10-01',cover:'cover.jpg'});
  s.addEntry({plantId:p.id,date:'2026-10-05',photos:['shared.jpg']});
  assert.deepEqual(M.orphanPhotoPaths(s.state,['cover.jpg','shared.jpg','draft.jpg','orphan.jpg'],['draft.jpg']),['orphan.jpg']);
  s.deletePlant(p.id);assert.deepEqual(M.orphanPhotoPaths(s.state,['cover.jpg','shared.jpg','draft.jpg'],[]),['cover.jpg','shared.jpg','draft.jpg']);
});
