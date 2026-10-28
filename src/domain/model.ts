export interface Plant { id: string; name: string; species: string; date: string; location: string; cover: string }
export interface Entry { id: string; plantId: string; date: string; title: string; text: string; photos: string[]; stage: string; kind: 'diary' | 'care' }
export interface Task { id: string; plantId: string; type: string; due: string; repeat: number; status: 'pending' | 'done' | 'skipped'; completed?: string }
export interface DiaryState { version: 1; plants: Plant[]; entries: Entry[]; tasks: Task[] }
export type PlantInput = Omit<Plant, 'id' | 'cover' | 'location' | 'species'> & Partial<Pick<Plant, 'cover' | 'location' | 'species'>>;
export type EntryInput = Pick<Entry, 'plantId' | 'date'> & Partial<Pick<Entry, 'title' | 'text' | 'photos' | 'stage'>>;
export type TaskInput = Pick<Task, 'plantId' | 'type' | 'due'> & { repeat?: number };
export function orphanPhotoPaths(state: DiaryState, saved: string[], drafts: string[] = []): string[] {
  const referenced = new Set([...state.plants.map(p=>p.cover), ...state.entries.flatMap(e=>e.photos), ...drafts]);
  return saved.filter(path=>!referenced.has(path));
}
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
const empty = (): DiaryState => ({ version: 1, plants: [], entries: [], tasks: [] });
export function today() { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); }
function epoch(s: string) { const a = String(s).split('-').map(Number); return Date.UTC(a[0], a[1] - 1, a[2]); }
export function validDate(s: string) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(epoch(s)) && new Date(epoch(s)).toISOString().slice(0, 10) === s; }
export const daysSince = (s: string, end = today()) => Math.max(1, Math.floor((epoch(end) - epoch(s)) / 86400000) + 1);
export const addDays = (s: string, n: number) => new Date(epoch(s) + n * 86400000).toISOString().slice(0, 10);
export function validateState(input: unknown): DiaryState {
  const x = input as DiaryState;
  if (!x || x.version !== 1 || !Array.isArray(x.plants) || !Array.isArray(x.entries) || !Array.isArray(x.tasks)) throw Error('备份格式不正确');
  const ids = new Set<string>();
  for (const p of x.plants) {
    if (!p || typeof p.id !== 'string' || ids.has(p.id) || typeof p.name !== 'string' || !p.name.trim() || !validDate(p.date) || typeof p.cover !== 'string') throw Error('备份中的植物档案不正确');
    ids.add(p.id);
  }
  for (const e of x.entries) if (!e || !ids.has(e.plantId) || typeof e.id !== 'string' || !validDate(e.date) || typeof e.text !== 'string' || typeof e.stage !== 'string' || !e.stage || (e.title !== undefined && typeof e.title !== 'string') || !['diary','care'].includes(e.kind) || !Array.isArray(e.photos) || e.photos.some(p => typeof p !== 'string')) throw Error('备份中的成长记录不正确');
  for (const t of x.tasks) if (!t || !ids.has(t.plantId) || typeof t.id !== 'string' || !validDate(t.due) || !['pending', 'done', 'skipped'].includes(t.status) || !Number.isInteger(t.repeat) || t.repeat < 0 || t.repeat > 365 || typeof t.type !== 'string') throw Error('备份中的养护任务不正确');
  return clone(x);
}
export function createStore(adapter: { read: () => DiaryState | string | null; write: (s: DiaryState) => void; today?: () => string }) {
  const now = adapter.today || today;
  const loaded = adapter.read();
  let state = loaded ? validateState(typeof loaded === 'string' ? JSON.parse(loaded) : loaded) : empty();
  const dateCheck = (d: string) => { if (!validDate(d) || d > now()) throw Error('请填写有效日期，不能晚于今天'); };
  const plant = (id: string) => { const p = state.plants.find(p => p.id === id); if (!p) throw Error('植物不存在'); return p; };
  const pending = (id: string) => { const t = state.tasks.find(t => t.id === id); if (!t || t.status !== 'pending') throw Error('任务不存在或已经完成'); return t; };
  function change<T>(fn: () => T): T { const before = clone(state); try { const result = fn(); adapter.write(clone(state)); return result; } catch (err) { state = before; throw err; } }
  function nextTask(t: Task) { if (t.repeat) state.tasks.push({ ...t, id: uid(), due: addDays(now(), t.repeat), status: 'pending', completed: undefined }); }
  const api = {
    get state() { return state; },
    addPlant(data: PlantInput) { return change(() => {
      if (!data.name?.trim()) throw Error('请填写植物名称'); dateCheck(data.date);
      const p: Plant = { id: uid(), name: data.name.trim().slice(0, 30), species: (data.species || '').slice(0, 40), location: (data.location || '我的阳台').slice(0, 40), date: data.date, cover: data.cover || 'plant:monstera' };
      state.plants.unshift(p); return p;
    }); },
    updatePlant(id: string, data: PlantInput) { return change(() => { const p = plant(id); if (!data.name?.trim()) throw Error('请填写植物名称'); dateCheck(data.date); if(state.entries.some(e=>e.plantId===id && e.date<data.date)) throw Error('种植日期不能晚于已有成长记录'); Object.assign(p, { name: data.name.trim().slice(0, 30), species: (data.species || '').slice(0, 40), location: (data.location || '').slice(0, 40), date: data.date, cover: data.cover || p.cover }); return p; }); },
    deletePlant(id: string) { return change(() => { plant(id); state.plants = state.plants.filter(p => p.id !== id); state.entries = state.entries.filter(e => e.plantId !== id); state.tasks = state.tasks.filter(t => t.plantId !== id); }); },
    addEntry(data: EntryInput) { return change(() => {
      const p = plant(data.plantId); dateCheck(data.date); if (data.date < p.date) throw Error('记录日期不能早于种植日期');
      if (!(data.text || '').trim() && !(data.photos || []).length) throw Error('请添加照片或写下成长记录');
      const e: Entry = { id: uid(), plantId: p.id, date: data.date, title: (data.title || '').trim().slice(0, 60), text: (data.text || '').trim().slice(0, 1000), photos: (data.photos || []).slice(0, 6), stage: data.stage || '日常', kind: 'diary' };
      state.entries.unshift(e); return e;
    }); },
    deleteEntry(id: string) { return change(() => { state.entries = state.entries.filter(e => e.id !== id); }); },
    addTask(data: TaskInput) { return change(() => {
      plant(data.plantId); if (!validDate(data.due)) throw Error('请填写有效任务日期');
      const repeat = Number(data.repeat || 0); if (!Number.isInteger(repeat) || repeat < 0 || repeat > 365) throw Error('重复周期需为0至365天');
      if (!data.type?.trim()) throw Error('请选择养护类型');
      const t: Task = { id: uid(), plantId: data.plantId, type: data.type.trim().slice(0, 30), due: data.due, repeat, status: 'pending' }; state.tasks.push(t); return t;
    }); },
    completeTask(id: string) { return change(() => { const t = pending(id); t.status = 'done'; t.completed = now(); state.entries.unshift({ id: uid(), plantId: t.plantId, date: now(), title: t.type, text: '完成了' + t.type, stage: t.type, kind: 'care', photos: [] }); nextTask(t); }); },
    postpone(id: string) { return change(() => { const t = pending(id); t.due = addDays(t.due < now() ? now() : t.due, 1); }); },
    skip(id: string) { return change(() => { const t = pending(id); t.status = 'skipped'; nextTask(t); }); },
    restore(data: unknown) { const valid = validateState(data); return change(() => { state = valid; }); },
    clear() { return change(() => { state = empty(); }); },
    seed() { return change(() => {
      const d = now();
      state = { version: 1, plants: [
        { id: 'tomato', name: '小番茄', species: '樱桃番茄', date: addDays(d, -31), location: '南向阳台', cover: 'plant:tomato' },
        { id: 'jasmine', name: '茉莉', species: '茉莉花', date: addDays(d, -17), location: '窗边花架', cover: 'plant:jasmine' },
        { id: 'mint', name: '薄荷', species: '留兰香', date: addDays(d, -11), location: '厨房窗台', cover: 'plant:mint' },
        { id: 'monstera', name: '龟背竹', species: '龟背竹', date: addDays(d, -55), location: '客厅', cover: 'plant:monstera' }
      ], entries: [
        { id: 'e1', plantId: 'tomato', date: d, title: '第一朵花开了', text: '今天早上发现开出了第一朵黄色的小花，好像在告诉我，新的旅程要开始了！', stage: '开花', kind: 'diary', photos: ['plant:tomato'] },
        { id: 'e2', plantId: 'tomato', date: addDays(d, -15), title: '长出新叶', text: '又冒出了几片新叶，叶子变得更绿更有精神了。', stage: '长叶', kind: 'diary', photos: ['plant:mint'] },
        { id: 'e3', plantId: 'tomato', date: addDays(d, -25), title: '小芽探出头', text: '小小的嫩芽钻出土面，带着生命的力量。', stage: '发芽', kind: 'diary', photos: [] },
        { id: 'e4', plantId: 'tomato', date: addDays(d, -31), title: '种下新的期待', text: '把一颗小小的种子种进土里，期待它破土而出。', stage: '播种', kind: 'diary', photos: [] }
      ], tasks: [
        { id: 't1', plantId: 'mint', type: '浇水', due: d, repeat: 3, status: 'pending' },
        { id: 't2', plantId: 'jasmine', type: '施肥', due: d, repeat: 14, status: 'pending' },
        { id: 't3', plantId: 'tomato', type: '修剪', due: d, repeat: 0, status: 'pending' }
      ] }; }); }
  };
  return api;
}
export function createRepository(adapter: Parameters<typeof createStore>[0]) {
  let raw: ReturnType<typeof adapter.read> = null;
  let error = '';
  let engine: ReturnType<typeof createStore>;
  try {
    raw = adapter.read();
    engine = createStore({ ...adapter, read: () => raw });
    if (raw === null) engine.seed();
  } catch {
    error = '读取本地数据失败，请先导出原始缓存，再导入备份恢复';
    engine = createStore({ ...adapter, read: () => null });
  }
  return {
    get state() { return engine.state; },
    get error() { return error; },
    backup() { if(error) { if(raw===null)throw Error('无法读取缓存，请检查设备存储权限');return typeof raw==='string'?raw:JSON.stringify(raw,null,2); } return JSON.stringify(engine.state,null,2); },
    run<T>(fn: (s: ReturnType<typeof createStore>) => T): T { if(error)throw Error(error);return fn(engine); },
    recover(fn: (s: ReturnType<typeof createStore>) => void) { fn(engine);error='';raw=clone(engine.state); }
  };
}

