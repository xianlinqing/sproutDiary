(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlantDiary = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const clone = x => JSON.parse(JSON.stringify(x));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  function today() { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); }
  function epoch(s) { const a = String(s).split('-').map(Number); return Date.UTC(a[0], a[1] - 1, a[2]); }
  function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(epoch(s)) && new Date(epoch(s)).toISOString().slice(0, 10) === s; }
  const daysSince = (s, end) => Math.max(1, Math.floor((epoch(end || today()) - epoch(s)) / 86400000) + 1);
  const addDays = (s, n) => new Date(epoch(s) + n * 86400000).toISOString().slice(0, 10);
  function validateState(x) {
    if (!x || x.version !== 1 || !['plants', 'entries', 'tasks'].every(k => Array.isArray(x[k]))) throw Error('备份格式不正确');
    const ids = new Set();
    for (const p of x.plants) {
      if (!p || typeof p.id !== 'string' || ids.has(p.id) || typeof p.name !== 'string' || !p.name.trim() || !validDate(p.date)) throw Error('备份中的植物档案不正确');
      ids.add(p.id);
    }
    for (const e of x.entries) if (!e || !ids.has(e.plantId) || typeof e.id !== 'string' || !validDate(e.date) || typeof e.text !== 'string' || !Array.isArray(e.photos) || e.photos.some(p => typeof p !== 'string')) throw Error('备份中的成长记录不正确');
    for (const t of x.tasks) if (!t || !ids.has(t.plantId) || typeof t.id !== 'string' || !validDate(t.due) || !['pending', 'done', 'skipped'].includes(t.status) || !Number.isInteger(t.repeat) || t.repeat < 0 || t.repeat > 365 || typeof t.type !== 'string') throw Error('备份中的养护任务不正确');
    return clone(x);
  }
  function createStore(adapter) {
    const now = adapter.today || today;
    const loaded = adapter.read();
    let state = loaded ? validateState(typeof loaded === 'string' ? JSON.parse(loaded) : loaded) : { version: 1, plants: [], entries: [], tasks: [] };
    const dateCheck = d => { if (!validDate(d) || d > now()) throw Error('请填写有效日期，不能晚于今天'); };
    const plant = id => { const p = state.plants.find(p => p.id === id); if (!p) throw Error('植物不存在'); return p; };
    const pending = id => { const t = state.tasks.find(t => t.id === id); if (!t || t.status !== 'pending') throw Error('任务不存在或已经完成'); return t; };
    function change(fn) { const before = clone(state); try { const result = fn(); adapter.write(clone(state)); return result; } catch (err) { state = before; throw err; } }
    function nextTask(t) { if (t.repeat) state.tasks.push({ ...t, id: uid(), due: addDays(now(), t.repeat), status: 'pending' }); }
    return {
      get state() { return state; },
      addPlant(data) { return change(() => {
        if (!data.name || !data.name.trim()) throw Error('请填写植物名称'); dateCheck(data.date);
        const p = { id: uid(), name: data.name.trim().slice(0, 30), species: (data.species || '').slice(0, 40), location: (data.location || '我的阳台').slice(0, 40), date: data.date, cover: data.cover || '/assets/monstera.jpg' };
        state.plants.unshift(p); return p;
      }); },
      updatePlant(id, data) { return change(() => { const p = plant(id); if (!data.name || !data.name.trim()) throw Error('请填写植物名称'); dateCheck(data.date); Object.assign(p, { name: data.name.trim().slice(0, 30), species: (data.species || '').slice(0, 40), location: (data.location || '').slice(0, 40), date: data.date, cover: data.cover || p.cover }); return p; }); },
      deletePlant(id) { return change(() => { plant(id); state.plants = state.plants.filter(p => p.id !== id); state.entries = state.entries.filter(e => e.plantId !== id); state.tasks = state.tasks.filter(t => t.plantId !== id); }); },
      addEntry(data) { return change(() => {
        const p = plant(data.plantId); dateCheck(data.date); if (data.date < p.date) throw Error('记录日期不能早于种植日期');
        if (!(data.text || '').trim() && !(data.photos || []).length) throw Error('请添加照片或写下成长记录');
        const e = { id: uid(), plantId: p.id, date: data.date, text: (data.text || '').trim().slice(0, 1000), photos: (data.photos || []).slice(0, 6), stage: data.stage || '日常', kind: 'diary' };
        state.entries.unshift(e); return e;
      }); },
      deleteEntry(id) { return change(() => { state.entries = state.entries.filter(e => e.id !== id); }); },
      addTask(data) { return change(() => {
        plant(data.plantId); if (!validDate(data.due)) throw Error('请填写有效任务日期');
        const repeat = Number(data.repeat || 0); if (!Number.isInteger(repeat) || repeat < 0 || repeat > 365) throw Error('重复周期需为0至365天');
        if (!data.type || !data.type.trim()) throw Error('请选择养护类型');
        const t = { id: uid(), plantId: data.plantId, type: data.type.trim().slice(0, 30), due: data.due, repeat, status: 'pending' }; state.tasks.push(t); return t;
      }); },
      completeTask(id) { return change(() => { const t = pending(id); t.status = 'done'; t.completed = now(); state.entries.unshift({ id: uid(), plantId: t.plantId, date: now(), text: '完成了' + t.type, stage: t.type, kind: 'care', photos: [] }); nextTask(t); }); },
      postpone(id) { return change(() => { const t = pending(id); t.due = addDays(t.due < now() ? now() : t.due, 1); }); },
      skip(id) { return change(() => { const t = pending(id); t.status = 'skipped'; nextTask(t); }); },
      restore(data) { const valid = validateState(data); return change(() => { state = valid; }); },
      clear() { return change(() => { state = { version: 1, plants: [], entries: [], tasks: [] }; }); },
      seed() { return change(() => {
        const d = now();
        state = { version: 1, plants: [
          { id: 'tomato', name: '小番茄', species: '樱桃番茄', date: addDays(d, -31), location: '南向阳台', cover: '/assets/tomato.jpg' },
          { id: 'jasmine', name: '茉莉', species: '茉莉花', date: addDays(d, -17), location: '窗边花架', cover: '/assets/jasmine.jpg' },
          { id: 'mint', name: '薄荷', species: '留兰香', date: addDays(d, -11), location: '厨房窗台', cover: '/assets/mint.jpg' },
          { id: 'monstera', name: '龟背竹', species: '龟背竹', date: addDays(d, -55), location: '客厅', cover: '/assets/monstera.jpg' }
        ], entries: [
          { id: 'e1', plantId: 'tomato', date: d, text: '今天早上发现了第一朵小花。每天一点点的变化，都让人满心期待。', stage: '开花', kind: 'diary', photos: ['/assets/tomato.jpg'] },
          { id: 'e2', plantId: 'tomato', date: addDays(d, -15), text: '又长出了几片新叶，阳光下的绿色真好看。', stage: '长叶', kind: 'diary', photos: ['/assets/seedling.jpg'] },
          { id: 'e3', plantId: 'tomato', date: addDays(d, -25), text: '小小的嫩芽探出土面，种下的期待终于有了回应。', stage: '发芽', kind: 'diary', photos: ['/assets/seedling.jpg'] },
          { id: 'e4', plantId: 'tomato', date: addDays(d, -31), text: '今天种下几颗种子，把它们放在阳台上，等待故事开始。', stage: '播种', kind: 'diary', photos: [] }
        ], tasks: [
          { id: 't1', plantId: 'mint', type: '浇水', due: d, repeat: 3, status: 'pending' },
          { id: 't2', plantId: 'jasmine', type: '施肥', due: d, repeat: 14, status: 'pending' },
          { id: 't3', plantId: 'tomato', type: '修剪', due: d, repeat: 0, status: 'pending' }
        ] }; }); }
    };
  }
  return { createStore, today, daysSince, addDays, validDate };
});
