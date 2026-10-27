// Lógica de datos de Mimi Gym. Independiente del DOM: se puede probar en Node.
import { BASE_EXERCISES, DEFAULT_ROUTINES, DEFAULT_SETTINGS, LEG_MUSCLES, MUSCLES } from './catalog.js';

export const BACKUP_VERSION = 1;
const TZ = 'Europe/Madrid';

/* ---------- Fechas (siempre claves 'YYYY-MM-DD' en hora de Madrid) ---------- */
const fmtKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
export const dateKey = (d = new Date()) => fmtKey.format(d);
const utc = key => new Date(key + 'T00:00:00Z');
export const addDays = (key, n) => { const d = utc(key); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
// 0 = lunes ... 6 = domingo
export const weekdayIndex = key => (utc(key).getUTCDay() + 6) % 7;
export const weekStart = key => addDays(key, -weekdayIndex(key));
export const isValidKey = k => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k) && !Number.isNaN(utc(k).getTime()) && utc(k).toISOString().slice(0, 10) === k;

const uid = () => (globalThis.crypto?.randomUUID?.() ?? 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/* ---------- Validación de series ---------- */
export function cleanSet(s) {
  const kg = Number(String(s?.kg ?? '').replace(',', '.'));
  const reps = Number(String(s?.reps ?? '').replace(',', '.'));
  return { kg, reps };
}
export const isValidSet = s => Number.isFinite(s.kg) && s.kg >= 0 && s.kg <= 1000 && Number.isInteger(s.reps) && s.reps > 0 && s.reps <= 1000;
export function validSets(sets) { return (sets || []).map(cleanSet).filter(isValidSet).map(s => ({ kg: Math.round(s.kg * 100) / 100, reps: s.reps })); }

export class Store {
  constructor(adapter) { this.db = adapter; this.custom = []; this.routines = []; this.settings = { ...DEFAULT_SETTINGS }; }

  async init() {
    await this.db.open();
    this.custom = await this.db.getAll('customExercises');
    let routines = await this.db.getAll('routines');
    // Rutinas que aún no existen en este dispositivo (instalación nueva, o D/E llegando a una app que ya tenía A/B/C).
    // Sólo se AÑADEN: las que ya existen no se tocan, así se conservan los cambios de Mimi.
    const have = new Set(routines.map(r => r.id));
    const missing = DEFAULT_ROUTINES.map((r, i) => ({ ...r, exerciseIds: [...r.exerciseIds], order: i })).filter(r => !have.has(r.id));
    if (missing.length) { await this.db.putMany('routines', missing); routines = [...routines, ...missing]; }
    this.routines = routines.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const rows = await this.db.getAll('settings');
    this.settings = { ...DEFAULT_SETTINGS };
    rows.filter(r => !String(r.key).startsWith('draft:')).forEach(r => { this.settings[r.key] = r.value; });
    return this;
  }

  /* ---------- Catálogo ---------- */
  exercises() { return [...BASE_EXERCISES, ...this.custom]; }
  exercise(id) { return this.exercises().find(e => e.id === id) || null; }
  exerciseByName(name) { const n = norm(name); return this.exercises().find(e => norm(e.name) === n) || null; }
  exerciseRoutines(id) { return this.routines.filter(r => r.exerciseIds.includes(id)).map(r => r.id); }

  /* Ejercicios propios (desde Ajustes o desde la cámara, con fotos). */
  static cleanExercise({ name, machine = '', primary = [], secondary = [], cues = [], photos, step }) {
    const ok = new Set(MUSCLES.filter(m => !m.group).map(m => m.id));
    name = String(name || '').trim().slice(0, 80);
    if (!name) throw new Error('El ejercicio necesita un nombre');
    const prim = [...new Set((primary || []).filter(m => ok.has(m)))];
    const out = { name, machine: String(machine || '').trim().slice(0, 80), primary: prim,
      secondary: [...new Set((secondary || []).filter(m => ok.has(m) && !prim.includes(m)))],
      cues: (cues || []).map(c => String(c || '').trim().slice(0, 200)).filter(Boolean).slice(0, 5) };
    if (photos !== undefined) out.photos = (photos || []).filter(p => typeof p === 'string' && p.startsWith('data:image/')).slice(0, 3);
    if (step !== undefined) out.step = step === 5 ? 5 : 2.5;
    return out;
  }
  async addCustomExercise(data) {
    const c = Store.cleanExercise(data);
    const dup = this.exerciseByName(c.name);
    if (dup) throw Object.assign(new Error(`Ya existe «${dup.name}»`), { existingId: dup.id });
    const ex = { id: 'c-' + uid(), step: 2.5, photos: [], ...c, custom: true, createdAt: Date.now() };
    await this.db.put('customExercises', ex);
    this.custom.push(ex);
    return ex;
  }
  async updateCustomExercise(id, patch) {
    const ex = this.custom.find(e => e.id === id); if (!ex) throw new Error('Sólo se pueden editar tus ejercicios');
    const c = Store.cleanExercise({ ...ex, ...patch });
    const dup = this.exerciseByName(c.name); if (dup && dup.id !== id) throw new Error(`Ya existe «${dup.name}»`);
    Object.assign(ex, c, { editedAt: Date.now() });
    await this.db.put('customExercises', ex);
    return ex;
  }
  // No se borra un ejercicio con historial: los registros se quedarían sin nombre.
  async deleteCustomExercise(id) {
    if (!this.custom.some(e => e.id === id)) throw new Error('Sólo se pueden borrar tus ejercicios');
    if ((await this.logsForExercise(id)).length) throw new Error('Tiene registros guardados: no se puede borrar sin perder historial');
    for (const r of this.routines.filter(r => r.exerciseIds.includes(id))) await this.removeFromRoutine(r.id, id);
    await this.db.delete('customExercises', id);
    this.custom = this.custom.filter(e => e.id !== id);
  }

  filterExercises({ query = '', muscles = [], routineId = null } = {}) {
    const q = norm(query);
    const wanted = new Set(muscles.flatMap(m => (m === 'piernas' ? LEG_MUSCLES : [m])));
    return this.exercises().filter(e => {
      if (q && !(norm(e.name).includes(q) || norm(e.machine).includes(q))) return false;
      if (wanted.size && !e.primary.some(m => wanted.has(m))) return false; // sólo correspondencias reales (músculo principal)
      if (routineId && !this.exerciseRoutines(e.id).includes(routineId)) return false;
      return true;
    });
  }

  /* ---------- Ajustes ---------- */
  async setSetting(key, value) { this.settings[key] = value; await this.db.put('settings', { key, value }); }

  /* ---------- Rutinas (editables; no tocan catálogo ni historial) ---------- */
  routine(id) { return this.routines.find(r => r.id === id) || null; }
  async setRoutineExercises(id, exerciseIds) {
    const r = this.routine(id); if (!r) throw new Error('Rutina desconocida');
    r.exerciseIds = [...new Set(exerciseIds)];
    await this.db.put('routines', r);
    return r;
  }
  async addToRoutine(id, exId) { const r = this.routine(id); return this.setRoutineExercises(id, [...r.exerciseIds, exId]); }
  async removeFromRoutine(id, exId) { const r = this.routine(id); return this.setRoutineExercises(id, r.exerciseIds.filter(x => x !== exId)); }
  async replaceInRoutine(id, oldId, newId) { const r = this.routine(id); return this.setRoutineExercises(id, r.exerciseIds.map(x => (x === oldId ? newId : x))); }
  async moveInRoutine(id, exId, delta) {
    const ids = [...this.routine(id).exerciseIds]; const i = ids.indexOf(exId); const j = i + delta;
    if (i < 0 || j < 0 || j >= ids.length) return this.routine(id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    return this.setRoutineExercises(id, ids);
  }
  async resetRoutine(id) { const d = DEFAULT_ROUTINES.find(r => r.id === id); if (!d) throw new Error('Rutina desconocida'); return this.setRoutineExercises(id, d.exerciseIds); }

  /* ---------- Registros ---------- */
  async saveLog({ exerciseId, sets, date = dateKey(), routineId = null, sessionId = null }) {
    const clean = validSets(sets);
    if (!clean.length) throw new Error('Añade al menos una serie con repeticiones');
    if (!isValidKey(date)) throw new Error('Fecha no válida');
    const today = dateKey();
    const ts = date === today ? Date.now() : Date.parse(date + 'T12:00:00Z');
    const log = { id: uid(), sessionId: sessionId || uid(), exerciseId, date, ts, routineId, sets: clean };
    await this.db.put('logs', log);
    return log;
  }
  async updateLog(id, sets) {
    const log = await this.db.get('logs', id); if (!log) throw new Error('Registro no encontrado');
    const clean = validSets(sets); if (!clean.length) throw new Error('Añade al menos una serie con repeticiones');
    log.sets = clean; log.editedAt = Date.now();
    await this.db.put('logs', log); return log;
  }
  async deleteLog(id) { await this.db.delete('logs', id); }
  async allLogs() { return (await this.db.getAll('logs')).sort((a, b) => b.ts - a.ts); }
  async logsForExercise(exId) { return (await this.allLogs()).filter(l => l.exerciseId === exId); }
  async lastLog(exId) { return (await this.logsForExercise(exId))[0] || null; }
  async logsForDate(date) { return (await this.allLogs()).filter(l => l.date === date).reverse(); }

  // Último entrenamiento: sesión más reciente agrupada por sessionId.
  async lastSession() {
    const logs = await this.allLogs(); if (!logs.length) return null;
    const sid = logs[0].sessionId;
    const group = logs.filter(l => l.sessionId === sid).sort((a, b) => a.ts - b.ts);
    return { sessionId: sid, date: group[0].date, routineId: group.find(l => l.routineId)?.routineId || null, logs: group };
  }

  // Último día entrenado: TODOS los ejercicios de esa fecha (aunque vengan de varias sesiones), en orden de guardado.
  async lastDay() {
    const logs = await this.allLogs(); if (!logs.length) return null;
    const date = logs.reduce((m, l) => (l.date > m ? l.date : m), logs[0].date);
    const day = logs.filter(l => l.date === date).sort((a, b) => a.ts - b.ts);
    return { date, logs: day, routineIds: [...new Set(day.map(l => l.routineId).filter(Boolean))] };
  }

  /* ---------- Calendario y planificación ---------- */
  async trainedDates() { return new Set((await this.db.getAll('logs')).map(l => l.date)); }
  async plans() { const m = {}; (await this.db.getAll('plans')).forEach(p => { m[p.id] = p; }); return m; }
  async setPlan(date, routineId) {
    if (!isValidKey(date)) throw new Error('Fecha no válida');
    if (!this.routine(routineId)) throw new Error('Rutina desconocida');
    return this.db.put('plans', { id: date, routineId });
  }
  async removePlan(date) { await this.db.delete('plans', date); }
  // Planificar no equivale a entrenar: sólo escribe 'plans', nunca 'logs'.
  async planWeek(assignments) { for (const a of assignments) await this.setPlan(a.date, a.routineId); }
  async dayState(date) {
    if ((await this.trainedDates()).has(date)) return 'trained';
    return (await this.plans())[date] ? 'planned' : 'none';
  }
  async monthStates(year, month /* 1-12 */) {
    const trained = await this.trainedDates(); const plans = await this.plans(); const out = {};
    const prefix = `${year}-${String(month).padStart(2, '0')}-`;
    for (const d of trained) if (d.startsWith(prefix)) out[d] = 'trained';
    for (const d of Object.keys(plans)) if (d.startsWith(prefix) && !out[d]) out[d] = 'planned';
    return out;
  }
  async weekVisits(date = dateKey()) {
    const start = weekStart(date); const end = addDays(start, 6);
    return [...(await this.trainedDates())].filter(d => d >= start && d <= end).length;
  }
  async monthCount(year, month) { return Object.values(await this.monthStates(year, month)).filter(s => s === 'trained').length; }

  /* ---------- Borradores (series sin guardar sobreviven a cierres) ---------- */
  async saveDraft(exId, draft) { await this.db.put('settings', { key: 'draft:' + exId, value: draft }); }
  async loadDraft(exId) { return (await this.db.get('settings', 'draft:' + exId))?.value || null; }
  async clearDraft(exId) { await this.db.delete('settings', 'draft:' + exId); }

  /* ---------- Copias de seguridad ---------- */
  async exportBackup() {
    const dump = {};
    for (const s of ['logs', 'routines', 'plans', 'customExercises']) dump[s] = await this.db.getAll(s);
    dump.settings = (await this.db.getAll('settings')).filter(r => !String(r.key).startsWith('draft:'));
    return { app: 'mimi-gym', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), ...dump };
  }

  static validateBackup(obj) {
    const errors = [];
    if (!obj || typeof obj !== 'object') return { ok: false, errors: ['El archivo no es un JSON válido'] };
    if (obj.app !== 'mimi-gym') errors.push('No parece una copia de Mimi Gym');
    if (!Number.isInteger(obj.version) || obj.version > BACKUP_VERSION) errors.push('Versión de copia no compatible');
    for (const k of ['logs', 'routines', 'plans', 'customExercises', 'settings']) if (!Array.isArray(obj[k])) errors.push(`Falta la sección «${k}»`);
    if (!errors.length) {
      obj.logs.forEach((l, i) => {
        if (!l || typeof l.id !== 'string' || typeof l.exerciseId !== 'string' || !isValidKey(l.date) || !Number.isFinite(l.ts) || !Array.isArray(l.sets) || !l.sets.length || !l.sets.every(s => isValidSet(cleanSet(s)))) errors.push(`Registro ${i + 1} con datos no válidos`);
      });
      obj.plans.forEach((p, i) => { if (!p || !isValidKey(p.id) || typeof p.routineId !== 'string') errors.push(`Plan ${i + 1} no válido`); });
      obj.routines.forEach((r, i) => { if (!r || typeof r.id !== 'string' || !Array.isArray(r.exerciseIds)) errors.push(`Rutina ${i + 1} no válida`); });
    }
    return { ok: !errors.length, errors: errors.slice(0, 10), counts: errors.length ? null : { logs: obj.logs.length, plans: obj.plans.length, routines: obj.routines.length, customExercises: obj.customExercises.length } };
  }

  /** mode 'replace' sustituye todo; 'merge' añade lo que falta sin duplicar ni borrar. */
  async importBackup(obj, mode = 'merge') {
    const v = Store.validateBackup(obj); if (!v.ok) throw new Error(v.errors.join(' · '));
    const result = { added: 0, skipped: 0 };
    if (mode === 'replace') {
      for (const s of ['logs', 'routines', 'plans', 'customExercises']) { await this.db.clear(s); await this.db.putMany(s, obj[s]); }
      const cur = (await this.db.getAll('settings')).filter(r => String(r.key).startsWith('draft:'));
      await this.db.clear('settings'); await this.db.putMany('settings', [...cur, ...obj.settings]);
      result.added = obj.logs.length;
    } else {
      const have = new Set((await this.db.getAll('logs')).map(l => l.id));
      // Duplicado semántico: mismo ejercicio, fecha, instante y series
      const sig = l => `${l.exerciseId}|${l.date}|${l.ts}|${JSON.stringify(l.sets)}`;
      const haveSig = new Set((await this.db.getAll('logs')).map(sig));
      const fresh = obj.logs.filter(l => !have.has(l.id) && !haveSig.has(sig(l)));
      result.skipped = obj.logs.length - fresh.length; result.added = fresh.length;
      await this.db.putMany('logs', fresh);
      const ex = new Set((await this.db.getAll('customExercises')).map(e => e.id));
      await this.db.putMany('customExercises', obj.customExercises.filter(e => !ex.has(e.id)));
      const pl = await this.plans();
      await this.db.putMany('plans', obj.plans.filter(p => !pl[p.id]));
      const ro = new Set((await this.db.getAll('routines')).map(r => r.id));
      await this.db.putMany('routines', obj.routines.filter(r => !ro.has(r.id)));
      const st = new Set((await this.db.getAll('settings')).map(r => r.key));
      await this.db.putMany('settings', obj.settings.filter(r => !st.has(r.key)));
    }
    await this.init();
    return result;
  }

  /* ---------- Migración desde la V2.2 (mimiGymDataV1) ----------
     No he podido ver el código de la V2.2: esto es un lector TOLERANTE con nombres de campo
     habituales. Siempre muestra un informe de lo reconocido y de lo descartado, y sólo AÑADE
     datos (nunca borra ni sobrescribe). Hay que probarlo con una exportación real. */
  static parseLegacy(raw, store) {
    let data = raw;
    if (typeof raw === 'string') { try { data = JSON.parse(raw); } catch { return { ok: false, error: 'No es un JSON válido', logs: [], customExercises: [], unrecognized: [] }; } }
    if (!data || typeof data !== 'object') return { ok: false, error: 'Formato no reconocido', logs: [], customExercises: [], unrecognized: [] };
    const rawLogs = data.logs || data.registros || data.history || data.historial || [];
    const list = Array.isArray(rawLogs) ? rawLogs : Object.entries(rawLogs).flatMap(([k, v]) => (Array.isArray(v) ? v.map(x => ({ exercise: k, ...x })) : []));
    const logs = []; const unrecognized = []; const newCustom = new Map();
    const pick = (o, keys) => { for (const k of keys) if (o?.[k] !== undefined && o[k] !== null && o[k] !== '') return o[k]; return undefined; };
    list.forEach((e, i) => {
      const date = String(pick(e, ['date', 'fecha', 'day', 'dia']) ?? '').slice(0, 10);
      const name = pick(e, ['exerciseName', 'exercise', 'ejercicio', 'name', 'nombre', 'exerciseId']);
      const rawSets = pick(e, ['sets', 'series', 'entries']);
      const sets = validSets((Array.isArray(rawSets) ? rawSets : []).map(s => ({ kg: pick(s, ['kg', 'peso', 'weight']), reps: pick(s, ['reps', 'repeticiones', 'repetitions']) })));
      if (!isValidKey(date) || !name || !sets.length) { unrecognized.push({ index: i, reason: !isValidKey(date) ? 'fecha' : !name ? 'ejercicio' : 'series', sample: JSON.stringify(e).slice(0, 120) }); return; }
      let ex = store.exercise(String(name)) || store.exerciseByName(name);
      let exerciseId = ex?.id;
      if (!exerciseId) {
        const key = norm(name);
        if (!newCustom.has(key)) newCustom.set(key, { id: 'c-legacy-' + key.replace(/[^a-z0-9]+/g, '-'), name: String(name), machine: '', primary: [], secondary: [], step: 2.5, cues: [], custom: true });
        exerciseId = newCustom.get(key).id;
      }
      const ts = Number.isFinite(Number(pick(e, ['ts', 'timestamp']))) ? Number(pick(e, ['ts', 'timestamp'])) : Date.parse(date + 'T12:00:00Z') + i;
      logs.push({ id: 'legacy-' + date + '-' + exerciseId + '-' + i, sessionId: 'legacy-' + date, exerciseId, date, ts, routineId: null, sets, legacy: true });
    });
    return { ok: true, logs, customExercises: [...newCustom.values()], unrecognized };
  }

  async importLegacy(parsed) {
    const have = new Set((await this.db.getAll('logs')).map(l => l.id));
    const fresh = parsed.logs.filter(l => !have.has(l.id));
    const ex = new Set(this.custom.map(e => e.id));
    const newEx = parsed.customExercises.filter(e => !ex.has(e.id));
    await this.db.putMany('customExercises', newEx);
    await this.db.putMany('logs', fresh);
    await this.init();
    return { added: fresh.length, skipped: parsed.logs.length - fresh.length, customCreated: newEx.length };
  }
}
