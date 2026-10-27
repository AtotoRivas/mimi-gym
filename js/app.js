import { Store, dateKey, addDays, weekStart, weekdayIndex, isValidKey, validSets } from './store.js';
import { IdbAdapter } from './db.js';
import { MUSCLES, muscleLabel } from './catalog.js';
import { bodyPair, thumb } from './body.js';
import * as offline from './offline.js';

const store = new Store(new IdbAdapter());
const view = document.getElementById('view');
const $ = s => document.querySelector(s);

/* ---------- Utilidades ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => String(Math.round(Number(n) * 100) / 100).replace('.', ',');
const num = v => { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const dtf = o => new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', ...o });
const asDate = k => new Date(k + 'T12:00:00Z');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const fLong = k => cap(dtf({ weekday: 'long', day: 'numeric', month: 'long' }).format(asDate(k)));
const fMid = k => dtf({ day: 'numeric', month: 'long' }).format(asDate(k));
const fShort = k => dtf({ day: 'numeric', month: 'short' }).format(asDate(k));
const fDow = k => cap(dtf({ weekday: 'long' }).format(asDate(k)));
const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const newSid = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const normS = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const machineOf = e => (e.machine && normS(e.machine) !== normS(e.name) ? e.machine : '');
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;

const I = {
  chev: '<svg class="chev" width="18" height="18" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  search: '<svg width="18" height="18" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  swap: '<svg viewBox="0 0 24 24"><path d="M7 7h12l-3-3M17 17H5l3 3"/></svg>',
  play: '<svg width="26" height="26" viewBox="0 0 24 24" fill="#263F35"><path d="M8 5.5v13l11-6.5z"/></svg>',
  cal: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/></svg>',
};

/* ---------- Avisos y hojas ---------- */
let toastTimer;
function toast(msg, { action, label, sticky = false } = {}) {
  const t = $('#toast'); t.innerHTML = esc(msg) + (action ? `<button type="button" id="toastAct">${esc(label)}</button>` : '');
  t.classList.add('show'); clearTimeout(toastTimer);
  if (action) $('#toastAct').onclick = () => { t.classList.remove('show'); action(); };
  if (!sticky) toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
function openSheet(html, onClick) {
  const root = $('#sheetRoot');
  root.innerHTML = `<div class="scrim"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  const scrim = root.firstElementChild; const sheet = scrim.firstElementChild;
  scrim.onclick = e => { if (e.target === scrim) closeSheet(); };
  sheet.onclick = e => onClick?.(e, sheet);
  return sheet;
}
const closeSheet = () => { $('#sheetRoot').innerHTML = ''; };
const setSheet = (sheet, html) => { sheet.innerHTML = html; };

/* Selector genérico de ejercicio (devuelve id o null) */
function pickExercise({ title = 'Elegir ejercicio', exclude = [] } = {}) {
  return new Promise(resolve => {
    let q = '';
    const list = () => {
      const items = store.filterExercises({ query: q }).filter(e => !exclude.includes(e.id));
      return items.length ? items.map(e => `<button class="list-item" data-pick="${esc(e.id)}">${thumb(e.primary)}<div class="grow"><div class="t">${esc(e.name)}</div><div class="s">${esc(e.primary.map(muscleLabel).join(' · '))}</div></div></button>`).join('') : '<div class="empty">Nada con ese nombre</div>';
    };
    const sheet = openSheet(`<h3>${esc(title)}</h3><div class="search">${I.search}<input id="pq" type="search" placeholder="Buscar ejercicio o máquina" autocomplete="off"></div><div id="pl">${list()}</div><div class="spacer"></div><button class="btn btn-ghost" data-close>Cancelar</button>`, e => {
      const p = e.target.closest('[data-pick]'); if (p) { closeSheet(); resolve(p.dataset.pick); }
      if (e.target.closest('[data-close]')) { closeSheet(); resolve(null); }
    });
    sheet.querySelector('#pq').oninput = ev => { q = ev.target.value; sheet.querySelector('#pl').innerHTML = list(); };
  });
}

/* ---------- Router ---------- */
const parseHash = () => { const [p, qs] = (location.hash.slice(1) || '/hoy').split('?'); return { path: p || '/hoy', q: new URLSearchParams(qs || '') }; };
const qs = o => { const p = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => v != null && v !== '' && p.set(k, v)); const s = p.toString(); return s ? '?' + s : ''; };
const go = h => { location.hash = h; };
const replace = h => { location.replace(h); };

const routes = [
  [/^\/hoy$/, 'hoy', renderHoy],
  [/^\/rutinas$/, 'rutinas', renderRutinas],
  [/^\/rutina\/([^/]+)$/, 'rutinas', renderRutina],
  [/^\/ejercicios$/, 'ejercicios', renderEjercicios],
  [/^\/ejercicio\/([^/]+)$/, 'ejercicios', renderFicha, { focus: true }],
  [/^\/sesion\/([^/]+)\/([^/]+)$/, 'hoy', renderSesion],
  [/^\/entrenar\/([^/]+)$/, 'ejercicios', renderEntrenar, { focus: true }],
  [/^\/calendario$/, 'calendario', renderCalendario],
  [/^\/dia\/(\d{4}-\d{2}-\d{2})$/, 'calendario', renderDia],
  [/^\/ajustes$/, null, renderAjustes],
];
const TOP = new Set(['/hoy', '/rutinas', '/ejercicios', '/calendario']);
let token = 0, cleanup = null;

// Renderizados en serie: si cambias de pantalla mientras otra aún se pinta, la antigua NO puede pisar a la nueva.
let rendering = false, rerun = false;
async function render() {
  if (rendering) { rerun = true; return; }
  rendering = true;
  try { do { rerun = false; await doRender(); } while (rerun); } finally { rendering = false; }
}
async function doRender() {
  const my = ++token; const { path, q } = parseHash();
  if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
  closeSheet();
  const hit = routes.map(r => ({ r, m: path.match(r[0]) })).find(x => x.m);
  if (!hit) return replace('#/hoy');
  const [, tab, fn, opts = {}] = hit.r;
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
  $('#tabs').classList.toggle('hide', !!opts.focus);
  view.classList.toggle('focus', !!opts.focus);
  $('#backBtn').style.visibility = TOP.has(path) ? 'hidden' : 'visible';
  try {
    view.onclick = null; view.oninput = null; view.onfocusout = null; view.onkeydown = null; view.onchange = null;
    const c = await fn(...hit.m.slice(1), q);
    if (my !== token) { c?.(); return; }
    cleanup = c || null;
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="empty"><div class="big">Algo no ha ido bien</div>${esc(err.message || err)}<div class="spacer"></div><a class="btn btn-secondary" href="#/hoy">Volver al inicio</a></div>`;
  }
  view.scrollTop = 0;
}
window.addEventListener('hashchange', render);

$('#backBtn').onclick = () => {
  const { path, q } = parseHash();
  if (history.length > 1 && document.referrer !== undefined && sessionStorage.getItem('navDepth') > 0) return history.back();
  const parent = path.startsWith('/entrenar') ? (q.get('sid') ? `#/sesion/${q.get('r') || '_'}/${q.get('sid')}` : '#/ejercicios')
    : path.startsWith('/rutina/') ? '#/rutinas' : path.startsWith('/dia/') ? '#/calendario' : path.startsWith('/sesion') ? '#/hoy' : path.startsWith('/ejercicio/') ? '#/ejercicios' : '#/hoy';
  go(parent);
};
$('#menuBtn').onclick = () => go('#/ajustes');
// Profundidad de navegación interna (para que "volver" no salga de la app)
window.addEventListener('hashchange', () => sessionStorage.setItem('navDepth', String(Math.max(0, Number(sessionStorage.getItem('navDepth') || 0) + 1))));
sessionStorage.setItem('navDepth', '0');
window.addEventListener('popstate', () => sessionStorage.setItem('navDepth', String(Math.max(0, Number(sessionStorage.getItem('navDepth') || 0) - 2))));

/* ---------- HOY ---------- */
async function renderHoy() {
  const today = dateKey();
  const plan = (await store.plans())[today];
  const trained = await store.trainedDates();
  const plans = await store.plans();
  const last = await store.lastSession();
  const visits = await store.weekVisits(today);
  const start = weekStart(today);
  const dots = DOW.map((l, i) => { const d = addDays(start, i); const st = trained.has(d) ? 'trained' : plans[d] ? 'planned' : ''; return `<div class="dot ${st} ${d === today ? 'today' : ''}"><i>${st === 'trained' ? I.check : Number(d.slice(8))}</i><span>${l}</span></div>`; }).join('');
  const showLegacy = legacyRaw() && !store.settings.legacyImported && !store.settings.legacyDismissed;
  const legacyBanner = showLegacy ? `<div class="card last-box" style="margin-top:12px"><b>Datos de la versión anterior</b><p class="small muted" style="margin:4px 0 10px">He encontrado entrenamientos guardados por la V2.2 en este dispositivo. Revísalos antes de importarlos.</p><div class="row"><button class="btn btn-secondary btn-sm" data-legacy-go>Revisar</button><button class="btn btn-ghost btn-sm" data-legacy-no>Ahora no</button></div></div>` : '';
  const r = plan ? store.routine(plan.routineId) : null;
  const hero = r ? `<section class="hero t-${esc(r.id)}"><div class="letter">${esc(r.id)}</div><div class="lead">Hoy toca</div><h2>${esc(r.short)}</h2><div class="lead">${plural(r.exerciseIds.length, 'ejercicio', 'ejercicios')}</div><button class="btn btn-primary" data-start="${esc(r.id)}">Empezar entrenamiento ${I.arrow}</button></section>`
    : `<div class="eyebrow">¿Qué toca hoy?</div><div class="pick-grid">${store.routines.map(x => `<button class="pick" data-start="${esc(x.id)}"><span class="ltr">${esc(x.id)}</span><span class="grow"><b>${esc(x.name)}</b><br><span class="small muted">${plural(x.exerciseIds.length, 'ejercicio', 'ejercicios')}</span></span>${I.chev}</button>`).join('')}</div>`;
  const lastR = last && last.routineId ? store.routine(last.routineId) : null;
  const lastTitle = last ? (lastR ? lastR.short : last.logs.length === 1 ? (store.exercise(last.logs[0].exerciseId)?.name || 'Ejercicio') : 'Entrenamiento libre') : '';
  view.innerHTML = `
    <div class="row" style="margin-top:6px"><div class="grow"><h1 class="page-title">Hola, Mimi</h1><div class="sub" style="margin:0">${esc(fLong(today))}</div></div><a href="#/calendario" class="icon-btn" aria-label="Calendario">${I.cal}</a></div>
    ${legacyBanner}
    ${hero}
    <div class="eyebrow">Esta semana${visits ? ` · ${plural(visits, 'día entrenado', 'días entrenados')}` : ''}</div>
    <div class="week-dots">${dots}</div>
    ${last ? `<div class="eyebrow">Último entrenamiento</div><a class="list-item" href="#/dia/${last.date}"><div class="grow"><div class="t">${esc(lastTitle)}</div><div class="s">${esc(fLong(last.date))} · ${plural(last.logs.length, 'ejercicio', 'ejercicios')}</div></div>${I.chev}</a>` : `<p class="sub center" style="margin-top:26px">Cuando guardes tu primer entrenamiento aparecerá aquí.</p>`}`;
  view.onclick = async e => {
    const b = e.target.closest('[data-start]'); if (b) return go(`#/sesion/${b.dataset.start}/${newSid()}`);
    if (e.target.closest('[data-legacy-go]')) return legacyReview(legacyRaw(), renderHoy);
    if (e.target.closest('[data-legacy-no]')) { await store.setSetting('legacyDismissed', true); renderHoy(); }
  };
}

/* ---------- RUTINAS ---------- */
async function renderRutinas() {
  view.innerHTML = `<h1 class="page-title">Rutinas</h1><p class="sub">Tres rutinas base. Cámbialas a tu gusto.</p>` + store.routines.map(r => `
    <a class="rcard t-${esc(r.id)}" href="#/rutina/${esc(r.id)}"><div class="letter">${esc(r.id)}</div><h3>${esc(r.short)}</h3><div class="lead">${plural(r.exerciseIds.length, 'ejercicio', 'ejercicios')}</div></a>`).join('');
}

async function renderRutina(id) {
  const r = store.routine(id); if (!r) return replace('#/rutinas');
  const draw = () => {
    view.innerHTML = `<h1 class="page-title">${esc(r.name)}</h1><p class="sub">${plural(r.exerciseIds.length, 'ejercicio', 'ejercicios')} · puedes añadir, quitar, cambiar y reordenar</p>
      ${r.exerciseIds.map((eid, i) => { const e = store.exercise(eid); if (!e) return ''; return `<div class="list-item" data-eid="${esc(eid)}"><a class="row grow" href="#/ejercicio/${esc(eid)}" style="min-width:0">${thumb(e.primary)}<div class="grow"><div class="t">${esc(e.name)}</div><div class="s">${esc(e.primary.map(muscleLabel).join(' · '))}</div></div></a>
        <div class="row" style="gap:0"><button class="mini" data-act="up" aria-label="Subir" ${i === 0 ? 'disabled style="opacity:.3"' : ''}>${I.up}</button><button class="mini" data-act="down" aria-label="Bajar" ${i === r.exerciseIds.length - 1 ? 'disabled style="opacity:.3"' : ''}>${I.down}</button><button class="mini" data-act="swap" aria-label="Sustituir">${I.swap}</button><button class="mini" data-act="del" aria-label="Quitar de la rutina">${I.trash}</button></div></div>`; }).join('')}
      ${r.exerciseIds.length ? '' : '<div class="empty">La rutina está vacía. Añade un ejercicio.</div>'}
      <div class="spacer"></div><button class="btn btn-secondary" data-act="add">Añadir ejercicio</button>
      <div class="spacer"></div><button class="btn btn-ghost" data-act="reset">Restablecer rutina original</button>
      <div class="savebar"><button class="btn btn-primary" data-act="start" ${r.exerciseIds.length ? '' : 'disabled'}>Empezar entrenamiento ${I.arrow}</button></div>`;
  };
  draw();
  view.onclick = async e => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const eid = b.closest('[data-eid]')?.dataset.eid; const a = b.dataset.act;
    if (a === 'up') await store.moveInRoutine(id, eid, -1);
    else if (a === 'down') await store.moveInRoutine(id, eid, 1);
    else if (a === 'del') { await store.removeFromRoutine(id, eid); toast('Quitado de la rutina. Tu historial sigue intacto.'); }
    else if (a === 'swap') { const n = await pickExercise({ title: 'Sustituir por…', exclude: r.exerciseIds }); if (n) await store.replaceInRoutine(id, eid, n); }
    else if (a === 'add') { const n = await pickExercise({ title: 'Añadir a la rutina', exclude: r.exerciseIds }); if (n) await store.addToRoutine(id, n); }
    else if (a === 'reset') { if (confirm('¿Volver a la selección original de esta rutina? Tu historial no se toca.')) await store.resetRoutine(id); }
    else if (a === 'start') return go(`#/sesion/${id}/${newSid()}`);
    draw();
  };
}

/* ---------- EJERCICIOS + mapa muscular ---------- */
const exFilter = { q: '', muscles: new Set(), routine: null, verified: false };
function exList() {
  const items = store.filterExercises({ query: exFilter.q, muscles: [...exFilter.muscles], routineId: exFilter.routine, onlyVerified: exFilter.verified });
  const ver = store.verifiedIds();
  return items.length ? items.map(e => `<a class="list-item" href="#/ejercicio/${esc(e.id)}">${thumb(e.primary)}<div class="grow"><div class="t">${esc(e.name)}${ver.has(e.id) ? '<span class="pill ok">en mi gimnasio</span>' : ''}</div><div class="s">${esc(e.primary.map(muscleLabel).join(' · '))}${machineOf(e) ? ' · ' + esc(machineOf(e)) : ''}</div></div>${I.chev}</a>`).join('')
    : '<div class="empty"><div class="big">Nada por aquí</div>Prueba con otros filtros o quita alguno.</div>';
}
async function renderEjercicios() {
  const chip = (on, attrs, txt, cls = '') => `<button class="chip ${cls} ${on ? 'on' : ''}" ${attrs}>${txt}</button>`;
  const head = () => `<h1 class="page-title">Ejercicios</h1>
    <div class="search">${I.search}<input id="q" type="search" placeholder="Buscar ejercicio o máquina" value="${esc(exFilter.q)}" autocomplete="off"></div>
    <div class="chips">${chip(!exFilter.muscles.size, 'data-m=""', 'Todos')}${MUSCLES.map(m => chip(exFilter.muscles.has(m.id), `data-m="${m.id}"`, esc(m.label))).join('')}</div>
    <div class="chips">${store.routines.map(r => chip(exFilter.routine === r.id, `data-r="${esc(r.id)}"`, `Rutina ${esc(r.id)}`, 'sage')).join('')}${chip(exFilter.verified, 'data-v="1"', 'Verificada en mi gimnasio', 'sage')}<button class="chip" data-map="1">Mapa muscular</button></div>`;
  view.innerHTML = `<div id="head">${head()}</div><div id="list">${exList()}</div>`;
  const refresh = () => { $('#head').innerHTML = head(); $('#list').innerHTML = exList(); };
  view.oninput = e => { if (e.target.id === 'q') { exFilter.q = e.target.value; $('#list').innerHTML = exList(); } };
  view.onclick = e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.m !== undefined) { const m = t.dataset.m; if (!m) exFilter.muscles.clear(); else exFilter.muscles.has(m) ? exFilter.muscles.delete(m) : exFilter.muscles.add(m); refresh(); }
    else if (t.dataset.r) { exFilter.routine = exFilter.routine === t.dataset.r ? null : t.dataset.r; refresh(); }
    else if (t.dataset.v) { exFilter.verified = !exFilter.verified; refresh(); }
    else if (t.dataset.map) openMuscleMap(refresh);
  };
}

function openMuscleMap(onApply) {
  const sel = new Set([...exFilter.muscles].filter(m => m !== 'piernas'));
  const picks = new Set();
  const body = () => {
    const items = sel.size ? store.filterExercises({ muscles: [...sel] }) : [];
    const names = [...sel].map(muscleLabel);
    return `<h3>Mapa muscular</h3><p class="sub">Toca uno o varios músculos, por delante y por detrás.</p>
      ${bodyPair({ selected: sel, interactive: true })}
      <div class="muscle-legend">${names.length ? names.map(n => `<span><i></i>${esc(n)}</span>`).join('') : '<span class="muted">Ningún músculo seleccionado</span>'}</div>
      ${sel.size ? `<div class="eyebrow">${plural(items.length, 'ejercicio', 'ejercicios')} para esta selección</div>
        ${items.length ? items.map(e => `<label class="list-item" style="cursor:pointer"><input type="checkbox" data-ck="${esc(e.id)}" ${picks.has(e.id) || !picks.size && false ? 'checked' : ''} style="width:20px;height:20px;accent-color:#263F35"><div class="grow"><div class="t">${esc(e.name)}</div><div class="s">${esc(e.primary.map(muscleLabel).join(' · '))}</div></div></label>`).join('') : '<div class="empty">Todavía no hay ejercicios fiables para esa combinación.</div>'}
        <div class="spacer"></div><button class="btn btn-secondary" data-apply ${items.length ? '' : 'disabled'}>Ver estos ejercicios</button>
        <div class="spacer"></div><button class="btn btn-primary" data-session ${picks.size ? '' : 'disabled'}>Armar sesión con ${picks.size} seleccionado${picks.size === 1 ? '' : 's'}</button>` : ''}
      <div class="spacer"></div><button class="btn btn-ghost" data-close>Cerrar</button>`;
  };
  const sheet = openSheet(body(), e => {
    const z = e.target.closest('[data-muscle]');
    if (z) { const m = z.dataset.muscle; sel.has(m) ? sel.delete(m) : sel.add(m); picks.clear(); return setSheet(sheet, body()); }
    const ck = e.target.closest('[data-ck]');
    if (ck) { ck.checked ? picks.add(ck.dataset.ck) : picks.delete(ck.dataset.ck); const btn = sheet.querySelector('[data-session]'); btn.disabled = !picks.size; btn.textContent = `Armar sesión con ${picks.size} seleccionado${picks.size === 1 ? '' : 's'}`; return; }
    if (e.target.closest('[data-apply]')) { exFilter.muscles = new Set(sel); closeSheet(); onApply(); }
    else if (e.target.closest('[data-session]')) { const sid = newSid(); sessionStorage.setItem('extras:' + sid, JSON.stringify([...picks])); closeSheet(); go(`#/sesion/_/${sid}`); }
    else if (e.target.closest('[data-close]')) closeSheet();
  });
}

/* ---------- Medios (vídeo/imagen de demostración) ---------- */
let clipsCache = null;
const getClips = async () => (clipsCache ??= await offline.loadClips());

/* ---------- FICHA ---------- */
async function renderFicha(id) {
  const e = store.exercise(id); if (!e) return replace('#/ejercicios');
  const clip = (await getClips())[id];
  const last = await store.lastLog(id);
  const logs = await store.logsForExercise(id);
  const ver = store.verifiedIds().has(id);
  const media = clip?.video
    ? `<div class="media" id="media">${clip.poster ? `<img src="${esc(clip.poster)}" alt="">` : `<div class="pending"><div class="machine">${esc(e.machine || e.name)}</div></div>`}<button class="play" aria-label="Reproducir demostración"><span>${I.play}</span></button>${clip.validated === true ? '' : '<div class="badge">Demostración pendiente de validar</div>'}</div>`
    : `<div class="media"><div class="pending"><div class="machine">${esc(e.machine || e.name)}</div><div class="small muted" style="margin-top:8px">Aquí irá una demostración en vídeo</div></div><div class="badge">Demostración pendiente de validar</div></div>`;
  const setsHtml = sets => sets.map((s, i) => `<div class="set-line"><span>Serie ${i + 1}</span><b>${fmt(s.kg)} kg × ${s.reps} reps</b></div>`).join('');
  const tabs = { how: 'Cómo se hace', muscles: 'Músculos', hist: 'Historial' };
  let tab = 'how';
  const body = () => {
    if (tab === 'how') return e.cues.length ? e.cues.map((c, i) => `<div class="cue"><b>${i + 1}</b><span>${esc(c)}</span></div>`).join('') : '<p class="muted">Este ejercicio es tuyo y aún no tiene claves técnicas.</p>';
    if (tab === 'muscles') return bodyPair({ selected: new Set(e.primary) }).replace('body-pair', 'body-pair static') + `<div class="muscle-legend">${e.primary.map(m => `<span><i></i>${esc(muscleLabel(m))}</span>`).join('')}</div>${e.secondary.length ? `<p class="small muted center">También trabaja: ${esc(e.secondary.map(muscleLabel).join(', '))}</p>` : ''}`;
    return logs.length ? logs.map(l => `<div class="hist-day"><div class="row"><b class="grow">${esc(fMid(l.date))}</b><a class="small" style="text-decoration:underline" href="#/entrenar/${esc(id)}?log=${esc(l.id)}">Editar</a></div>${setsHtml(l.sets)}</div>`).join('') : '<p class="muted center" style="padding:20px 0">Todavía no hay registros de este ejercicio.</p>';
  };
  view.innerHTML = `${media}
    <h1 class="page-title" style="font-size:28px">${esc(e.name)}${ver ? '<span class="pill ok">en mi gimnasio</span>' : ''}</h1>
    <div class="sub" style="margin-bottom:10px">${esc(e.primary.map(muscleLabel).join(' · '))}${machineOf(e) ? ' · ' + esc(machineOf(e)) : ''}</div>
    <div class="card last-box"><div class="eyebrow" style="margin:0 0 6px">Último registro${last ? ' · ' + esc(fMid(last.date)) : ''}</div>${last ? setsHtml(last.sets) : '<div class="muted small">Aún no has registrado este ejercicio.</div>'}</div>
    <div class="tabs-in">${Object.entries(tabs).map(([k, v]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${v}</button>`).join('')}</div>
    <div id="tabBody">${body()}</div>
    <div class="savebar"><button class="btn btn-primary" data-train>Entrenar este ejercicio</button></div>`;
  view.onclick = ev => {
    const t = ev.target.closest('[data-tab]');
    if (t) { tab = t.dataset.tab; view.querySelectorAll('.tabs-in button').forEach(b => b.classList.toggle('on', b === t)); $('#tabBody').innerHTML = body(); return; }
    if (ev.target.closest('[data-train]')) return go(`#/entrenar/${id}`);
    if (ev.target.closest('#media .play')) {
      const m = $('#media'); const v = document.createElement('video');
      v.src = clip.video; v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
      v.onerror = () => { m.innerHTML = '<div class="pending"><div class="machine">No se pudo reproducir</div><div class="small muted" style="margin-top:6px">Prepara el contenido sin conexión desde Ajustes.</div></div>'; };
      v.onclick = () => (v.paused ? v.play() : v.pause());
      m.querySelector('.play')?.remove(); m.querySelector('img,.pending')?.remove(); m.prepend(v); v.play().catch(() => {});
    }
  };
}

/* ---------- SESIÓN ---------- */
async function sessionIds(rid, sid) {
  const base = rid !== '_' ? (store.routine(rid)?.exerciseIds || []) : [];
  const extras = JSON.parse(sessionStorage.getItem('extras:' + sid) || '[]');
  const logs = (await store.allLogs()).filter(l => l.sessionId === sid);
  return { ids: [...new Set([...base, ...extras, ...logs.map(l => l.exerciseId)])], logs };
}
async function renderSesion(rid, sid, q) {
  const date = q.get('date') && isValidKey(q.get('date')) ? q.get('date') : null;
  const r = rid !== '_' ? store.routine(rid) : null;
  if (rid !== '_' && !r) return replace('#/hoy');
  const draw = async () => {
    const { ids, logs } = await sessionIds(rid, sid);
    const done = new Set(logs.map(l => l.exerciseId));
    view.innerHTML = `<div class="eyebrow" style="margin-top:6px">${date ? esc(fLong(date)) : 'Hoy'}</div><h1 class="page-title">${esc(r ? r.name : 'Sesión libre')}</h1>
      <p class="sub">Haz los que quieras, en el orden que quieras. Cada ejercicio se guarda por separado.</p>
      ${ids.map(eid => { const e = store.exercise(eid); if (!e) return ''; const l = logs.filter(x => x.exerciseId === eid).slice(-1)[0];
        return `<a class="list-item" href="#/entrenar/${esc(eid)}${qs({ sid, r: rid, date })}">${done.has(eid) ? `<span class="done-mark">${I.check}</span>` : '<span class="todo-mark"></span>'}<div class="grow"><div class="t">${esc(e.name)}</div><div class="s">${l ? plural(l.sets.length, 'serie', 'series') + ' guardadas' : esc(e.primary.map(muscleLabel).join(' · '))}</div></div>${I.chev}</a>`; }).join('')}
      <div class="spacer"></div><button class="btn btn-secondary" data-add>Añadir otro ejercicio</button>
      <div class="savebar"><button class="btn btn-primary" data-finish>${done.size ? 'Terminar' : 'Salir'}</button></div>`;
    view.classList.add('focus'); $('#tabs').classList.add('hide');
  };
  await draw();
  view.onclick = async ev => {
    if (ev.target.closest('[data-add]')) {
      const { ids } = await sessionIds(rid, sid);
      const n = await pickExercise({ title: 'Añadir a esta sesión', exclude: ids });
      if (n) { const ex = JSON.parse(sessionStorage.getItem('extras:' + sid) || '[]'); ex.push(n); sessionStorage.setItem('extras:' + sid, JSON.stringify(ex)); draw(); }
    } else if (ev.target.closest('[data-finish]')) {
      const { logs } = await sessionIds(rid, sid);
      if (logs.length) toast('Entrenamiento guardado');
      go(date ? `#/dia/${date}` : '#/hoy');
    }
  };
}

/* ---------- ENTRENAR (registro de series) ---------- */
async function renderEntrenar(exId, q) {
  const ex = store.exercise(exId); if (!ex) return replace('#/ejercicios');
  const logId = q.get('log'); const sid = q.get('sid'); const rid = q.get('r');
  let editing = null;
  if (logId) { editing = await store.db.get('logs', logId); if (!editing) return replace(`#/ejercicio/${exId}`); }
  const last = editing ? null : await store.lastLog(exId);
  const draft = editing ? null : await store.loadDraft(exId);
  const st = {
    sets: editing ? editing.sets.map(s => ({ kg: fmt(s.kg), reps: String(s.reps) })) : (draft?.sets?.length ? draft.sets : []),
    step: draft?.step || ex.step || 2.5,
    date: editing ? editing.date : (q.get('date') && isValidKey(q.get('date')) ? q.get('date') : dateKey()),
  };
  const ph = i => { const s = last?.sets?.[Math.min(i, last.sets.length - 1)]; return s ? { kg: fmt(s.kg), reps: String(s.reps) } : { kg: '0', reps: '10' }; };
  const rowHtml = (s, i) => { const p = ph(i); return `<div class="set-row" data-i="${i}"><div class="n">${i + 1}</div>
    <div class="field"><label>kg</label><div class="stepper"><button type="button" data-act="kg-" aria-label="Menos peso">−</button><input data-f="kg" inputmode="decimal" enterkeyhint="next" autocomplete="off" placeholder="${p.kg}" value="${esc(s.kg)}" aria-label="Peso en kilos, serie ${i + 1}"><button type="button" data-act="kg+" aria-label="Más peso">+</button></div></div>
    <div class="field"><label>reps</label><div class="stepper"><button type="button" data-act="reps-" aria-label="Menos repeticiones">−</button><input data-f="reps" inputmode="numeric" enterkeyhint="done" autocomplete="off" placeholder="${p.reps}" value="${esc(s.reps)}" aria-label="Repeticiones, serie ${i + 1}"><button type="button" data-act="reps+" aria-label="Más repeticiones">+</button></div></div>
    <div class="set-actions"><button type="button" class="mini" data-act="dup" aria-label="Duplicar serie">${I.copy}</button><button type="button" class="mini" data-act="del" aria-label="Eliminar serie">${I.trash}</button></div></div>`; };
  const info = s => { const kgv = num(s.kg), rv = num(s.reps); const empty = s.kg === '' && s.reps === ''; const ok = Number.isFinite(kgv) && kgv >= 0 && Number.isInteger(rv) && rv > 0; return { empty, ok }; };
  const nValid = () => validSets(st.sets).length;
  const saveLabel = () => { const n = nValid(); return editing ? 'Guardar cambios' : n ? `Guardar ${plural(n, 'serie', 'series')}` : 'Guardar'; };
  const draw = () => {
    view.innerHTML = `
      <h1 class="page-title" style="font-size:26px">${esc(ex.name)}</h1>
      <div class="sub" style="margin-bottom:8px">${esc(ex.machine || ex.primary.map(muscleLabel).join(' · '))} · <a href="#/ejercicio/${esc(exId)}" style="text-decoration:underline">cómo se hace</a></div>
      ${last ? `<div class="card last-box"><div class="row"><div class="eyebrow grow" style="margin:0">Última vez · ${esc(fMid(last.date))}</div><button class="btn btn-secondary btn-sm" data-act="copy">Copiar series</button></div>${last.sets.map((s, i) => `<div class="set-line"><span>Serie ${i + 1}</span><b>${fmt(s.kg)} kg × ${s.reps} reps</b></div>`).join('')}</div>` : (editing ? '' : '<div class="note-box">Primera vez con este ejercicio: apunta lo que hagas y la próxima vez lo verás aquí.</div>')}
      <div class="stepbar">Salto de peso:<button class="chip ${st.step === 2.5 ? 'on' : ''}" data-act="step" data-v="2.5">2,5 kg</button><button class="chip ${st.step === 5 ? 'on' : ''}" data-act="step" data-v="5">5 kg</button></div>
      <div id="sets">${st.sets.map(rowHtml).join('')}</div>
      <button class="btn btn-secondary" data-act="add">Añadir serie</button>
      ${editing ? '' : `<div class="date-line"><label for="dt">Fecha</label><input id="dt" type="date" value="${st.date}" max="${dateKey()}"></div>`}
      <div class="savebar">${editing ? '<button class="btn btn-danger" style="flex:0 0 auto;width:auto" data-act="delete">Eliminar</button>' : ''}<button class="btn btn-primary" data-act="save">${saveLabel()}</button></div>`;
    markRows();
  };
  const markRows = () => view.querySelectorAll('.set-row').forEach((row, i) => { const s = st.sets[i]; const f = info(s); row.classList.toggle('bad', !f.empty && !f.ok && row !== document.activeElement?.closest?.('.set-row')); });
  const refreshSave = () => { const b = view.querySelector('[data-act="save"]'); if (b) b.textContent = saveLabel(); };
  let dt = null;
  const writeDraft = () => { if (editing) return; st.sets.some(s => s.kg !== '' || s.reps !== '') ? store.saveDraft(exId, { sets: st.sets, step: st.step }) : store.clearDraft(exId); };
  const persist = () => { if (editing) return; clearTimeout(dt); dt = setTimeout(() => { dt = null; writeDraft(); }, 350); };
  // Al salir de la pantalla o ocultar/cerrar la app, el borrador se guarda YA (no se espera al temporizador).
  const flush = () => { if (dt) { clearTimeout(dt); dt = null; writeDraft(); } };
  const onHide = () => { if (document.hidden) flush(); };
  document.addEventListener('visibilitychange', onHide); window.addEventListener('pagehide', flush);
  const rerenderSets = () => { $('#sets').innerHTML = st.sets.map(rowHtml).join(''); markRows(); refreshSave(); persist(); };
  draw();
  if (!st.sets.length && !editing) { st.sets.push({ kg: '', reps: '' }); rerenderSets(); }

  view.oninput = ev => { const inp = ev.target.closest('input[data-f]'); if (!inp) return; const i = Number(inp.closest('.set-row').dataset.i); st.sets[i][inp.dataset.f] = inp.value.trim(); refreshSave(); persist(); };
  view.onfocusout = () => setTimeout(markRows, 0);
  view.onkeydown = ev => { if (ev.key !== 'Enter') return; const inp = ev.target.closest('input[data-f]'); if (!inp) return; ev.preventDefault(); if (inp.dataset.f === 'kg') inp.closest('.set-row').querySelector('[data-f="reps"]').focus(); else inp.blur(); };
  view.onchange = ev => { if (ev.target.id === 'dt' && isValidKey(ev.target.value)) st.date = ev.target.value; };
  view.onclick = async ev => {
    const b = ev.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
    const row = b.closest('.set-row'); const i = row ? Number(row.dataset.i) : -1;
    if (a === 'kg-' || a === 'kg+' || a === 'reps-' || a === 'reps+') {
      const f = a.startsWith('kg') ? 'kg' : 'reps'; const dir = a.endsWith('+') ? 1 : -1;
      const inp = row.querySelector(`[data-f="${f}"]`); let cur = num(inp.value);
      if (!Number.isFinite(cur)) cur = num(inp.placeholder) || 0;
      const step = f === 'kg' ? st.step : 1;
      const next = Math.max(0, Math.round((cur + dir * step) * 100) / 100);
      inp.value = f === 'kg' ? fmt(next) : String(Math.round(next)); st.sets[i][f] = inp.value; markRows(); refreshSave(); persist();
    } else if (a === 'add') { const prev = st.sets[st.sets.length - 1]; st.sets.push(prev && (prev.kg || prev.reps) ? { ...prev } : { kg: '', reps: '' }); rerenderSets(); view.querySelector('.set-row:last-child [data-f="kg"]')?.focus(); }
    else if (a === 'dup') { st.sets.splice(i + 1, 0, { ...st.sets[i] }); rerenderSets(); }
    else if (a === 'del') { st.sets.splice(i, 1); if (!st.sets.length) st.sets.push({ kg: '', reps: '' }); rerenderSets(); }
    else if (a === 'copy') {
      if (st.sets.some(s => s.kg || s.reps) && !confirm('Esto sustituirá las series que llevas escritas. ¿Continuar?')) return;
      st.sets = last.sets.map(s => ({ kg: fmt(s.kg), reps: String(s.reps) })); rerenderSets(); toast('Series copiadas: ajústalas y guarda');
    } else if (a === 'step') { st.step = Number(b.dataset.v); view.querySelectorAll('[data-act="step"]').forEach(c => c.classList.toggle('on', c === b)); persist(); }
    else if (a === 'delete') { if (confirm('¿Eliminar este registro? No se puede deshacer.')) { await store.deleteLog(logId); toast('Registro eliminado'); replace(`#/dia/${editing.date}`); } }
    else if (a === 'save') {
      const good = validSets(st.sets).length; const partial = st.sets.filter(s => !info(s).empty).length - good;
      if (!good) return toast('Añade al menos una serie con kg y repeticiones');
      if (partial > 0 && !confirm(`${plural(partial, 'serie incompleta no se guardará', 'series incompletas no se guardarán')}. ¿Guardar igualmente?`)) return;
      try {
        if (editing) { await store.updateLog(logId, st.sets); toast('Cambios guardados'); return replace(`#/dia/${editing.date}`); }
        await store.saveLog({ exerciseId: exId, sets: st.sets, date: st.date, routineId: rid && rid !== '_' ? rid : null, sessionId: sid || newSid() });
        clearTimeout(dt); dt = null; await store.clearDraft(exId); toast('Guardado ✓');
        replace(sid ? `#/sesion/${rid || '_'}/${sid}${qs({ date: q.get('date') })}` : `#/ejercicio/${exId}`);
      } catch (err) { toast(err.message || 'No se pudo guardar'); }
    }
  };
  return () => { document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', flush); flush(); };
}

/* ---------- CALENDARIO ---------- */
const cal = { y: Number(dateKey().slice(0, 4)), m: Number(dateKey().slice(5, 7)) };
async function renderCalendario() {
  const today = dateKey();
  const states = await store.monthStates(cal.y, cal.m);
  const plans = await store.plans(); const trained = await store.trainedDates();
  const first = `${cal.y}-${String(cal.m).padStart(2, '0')}-01`;
  const dim = new Date(Date.UTC(cal.y, cal.m, 0)).getUTCDate();
  const offset = weekdayIndex(first);
  const title = cap(dtf({ month: 'long' }).format(asDate(first))) + ' ' + cal.y;
  let cells = DOW.map(d => `<div class="cal-dow">${d}</div>`).join('') + '<div></div>'.repeat(offset);
  for (let d = 1; d <= dim; d++) { const k = `${cal.y}-${String(cal.m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; const s = states[k] || ''; cells += `<div class="cal-cell"><button class="${s} ${k === today ? 'today' : ''}" data-day="${k}" aria-label="${esc(fLong(k))}${s === 'trained' ? ', entrenado' : s === 'planned' ? ', planificado' : ''}">${d}</button></div>`; }
  const ws = weekStart(today); const weekPlans = Object.values(plans).filter(p => p.id >= ws && p.id <= addDays(ws, 6)).sort((a, b) => a.id.localeCompare(b.id));
  const count = await store.monthCount(cal.y, cal.m);
  view.innerHTML = `<h1 class="page-title">Calendario</h1>
    <div class="cal-head"><button class="icon-btn" data-nav="-1" aria-label="Mes anterior"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button><h2>${esc(title)}</h2><button class="icon-btn" data-nav="1" aria-label="Mes siguiente"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 5l7 7-7 7"/></svg></button></div>
    <div class="cal-grid">${cells}</div>
    <div class="legend"><span><i style="background:var(--green)"></i>Entrenado</span><span><i style="background:var(--sage-soft)"></i>Planificado</span></div>
    ${count ? `<p class="small muted center" style="margin:-4px 0 12px">${plural(count, 'día entrenado', 'días entrenados')} este mes</p>` : ''}
    <button class="btn btn-primary" data-plan>${I.cal} Planificar semana</button>
    <div class="eyebrow">Esta semana</div>
    ${weekPlans.length ? weekPlans.map(p => { const r = store.routine(p.routineId); const done = trained.has(p.id); return `<a class="week-check" href="#/dia/${p.id}">${done ? `<span class="done-mark">${I.check}</span>` : '<span class="todo-mark"></span>'}<span class="grow"><b>${esc(r?.short || 'Rutina')}</b><br><span class="small muted">${esc(fDow(p.id))} ${esc(fShort(p.id))}</span></span>${I.chev}</a>`; }).join('') : '<p class="muted small">Todavía no has planificado esta semana. Es opcional: también puedes entrenar cuando te apetezca.</p>'}`;
  view.onclick = ev => {
    const n = ev.target.closest('[data-nav]'); if (n) { cal.m += Number(n.dataset.nav); if (cal.m < 1) { cal.m = 12; cal.y--; } if (cal.m > 12) { cal.m = 1; cal.y++; } return renderCalendario(); }
    const d = ev.target.closest('[data-day]'); if (d) return go('#/dia/' + d.dataset.day);
    if (ev.target.closest('[data-plan]')) openPlanner();
  };
}

function openPlanner() {
  let wk = weekStart(dateKey()); let sel = new Map(); const RT = () => store.routines.map(r => r.id);
  let plans = {}, trained = new Set();
  const loadWeek = () => { sel = new Map(); for (let i = 0; i < 7; i++) { const d = addDays(wk, i); if (plans[d]) sel.set(d, plans[d].routineId); } };
  const body = () => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(wk, i));
    const chosen = days.filter(d => sel.has(d));
    return `<h3>Planificar semana</h3><p class="sub">Elige los días que quieras entrenar. Nada queda fijo: lo puedes cambiar cuando quieras.</p>
      <div class="cal-head"><button class="icon-btn" data-wk="-7" aria-label="Semana anterior"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button><b>Semana del ${esc(fMid(wk))}</b><button class="icon-btn" data-wk="7" aria-label="Semana siguiente"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 5l7 7-7 7"/></svg></button></div>
      <div class="day-pick">${days.map((d, i) => `<button data-d="${d}" class="${sel.has(d) ? 'on' : ''} ${trained.has(d) ? 'trained' : ''}" aria-pressed="${sel.has(d)}">${DOW[i]}<b>${Number(d.slice(8))}</b></button>`).join('')}</div>
      ${chosen.map(d => `<div class="row" style="margin:8px 0"><div class="grow"><b>${esc(fDow(d))} ${Number(d.slice(8))}</b></div><select class="sel" style="width:58%" data-r="${d}">${RT().map(id => `<option value="${esc(id)}" ${sel.get(d) === id ? 'selected' : ''}>${esc(id)} · ${esc(store.routine(id).short)}</option>`).join('')}</select></div>`).join('')}
      <div class="spacer"></div><button class="btn btn-primary" data-save>Guardar plan</button><div class="spacer"></div><button class="btn btn-ghost" data-close>Cancelar</button>`;
  };
  Promise.all([store.plans(), store.trainedDates()]).then(([p, t]) => {
    plans = p; trained = t; loadWeek();
    const sheet = openSheet(body(), async ev => {
      const w = ev.target.closest('[data-wk]'); if (w) { wk = addDays(wk, Number(w.dataset.wk)); loadWeek(); return setSheet(sheet, body()); }
      const d = ev.target.closest('[data-d]'); if (d) { const k = d.dataset.d; if (sel.has(k)) sel.delete(k); else { const used = [...sel.values()]; const next = RT().find(r => !used.includes(r)) || RT()[sel.size % RT().length]; sel.set(k, next); } return setSheet(sheet, body()); }
      if (ev.target.closest('[data-close]')) return closeSheet();
      if (ev.target.closest('[data-save]')) {
        for (let i = 0; i < 7; i++) { const k = addDays(wk, i); if (!sel.has(k) && plans[k]) await store.removePlan(k); }
        for (const [k, r] of sel) await store.setPlan(k, r);
        closeSheet(); toast(sel.size ? 'Semana planificada' : 'Plan de la semana vaciado'); render();
      }
    });
    sheet.onchange = ev => { const s = ev.target.closest('select[data-r]'); if (s) sel.set(s.dataset.r, s.value); };
  });
}

/* ---------- DÍA ---------- */
async function renderDia(date) {
  const today = dateKey();
  const logs = await store.logsForDate(date); const plan = (await store.plans())[date];
  const bySession = new Map(); logs.forEach(l => { if (!bySession.has(l.sessionId)) bySession.set(l.sessionId, []); bySession.get(l.sessionId).push(l); });
  const state = logs.length ? 'Día entrenado' : plan ? 'Día planificado' : 'Sin actividad';
  view.innerHTML = `<div class="eyebrow" style="margin-top:6px">${state}</div><h1 class="page-title" style="font-size:26px">${esc(fLong(date))}</h1>
    ${logs.length ? [...bySession.values()].map(g => `<div class="card last-box" style="margin-top:10px">${g.map(l => { const e = store.exercise(l.exerciseId); return `<div class="hist-day" style="padding-top:6px"><div class="row"><a class="grow" href="#/ejercicio/${esc(l.exerciseId)}"><b>${esc(e?.name || 'Ejercicio')}</b></a><a class="small" style="text-decoration:underline" href="#/entrenar/${esc(l.exerciseId)}?log=${esc(l.id)}">Corregir</a></div>${l.sets.map((s, i) => `<div class="set-line"><span>Serie ${i + 1}</span><b>${fmt(s.kg)} kg × ${s.reps} reps</b></div>`).join('')}</div>`; }).join('')}</div>`).join('') : ''}
    ${plan ? (() => { const r = store.routine(plan.routineId); return `<div class="card last-box" style="margin-top:10px"><div class="row"><div class="grow"><b>${esc(r?.name || 'Rutina')}</b><div class="small muted">Planificada</div></div><button class="btn btn-ghost btn-sm" data-unplan>Quitar</button></div></div>`; })() : ''}
    <div class="eyebrow">${logs.length ? 'Añadir a este día' : 'Registrar en este día'}</div>
    <div class="pick-grid">${store.routines.map(r => `<button class="pick" data-start="${esc(r.id)}"><span class="ltr">${esc(r.id)}</span><span class="grow"><b>${esc(r.short)}</b></span>${I.chev}</button>`).join('')}
    <button class="pick" data-single><span class="ltr">+</span><span class="grow"><b>Un solo ejercicio</b></span>${I.chev}</button></div>
    ${!plan && !logs.length && date >= today ? `<div class="eyebrow">Planificar</div><div class="chips">${store.routines.map(r => `<button class="chip" data-plan="${esc(r.id)}">Rutina ${esc(r.id)}</button>`).join('')}</div>` : ''}`;
  view.onclick = async ev => {
    const s = ev.target.closest('[data-start]'); if (s) return go(`#/sesion/${s.dataset.start}/${newSid()}${qs({ date: date === today ? '' : date })}`);
    if (ev.target.closest('[data-single]')) { const n = await pickExercise({ title: 'Ejercicio a registrar' }); if (n) go(`#/entrenar/${n}${qs({ date: date === today ? '' : date })}`); return; }
    if (ev.target.closest('[data-unplan]')) { await store.removePlan(date); toast('Plan quitado'); return renderDia(date); }
    const p = ev.target.closest('[data-plan]'); if (p) { await store.setPlan(date, p.dataset.plan); toast('Día planificado'); renderDia(date); }
  };
}

/* ---------- Datos de la V2.2 (mismo origen => localStorage legible) ---------- */
const LEGACY_KEY = 'mimiGymDataV1';
function legacyRaw() { try { return localStorage.getItem(LEGACY_KEY); } catch { return null; } }
function legacyReview(raw, after) {
  const parsed = Store.parseLegacy(raw, store);
  if (!parsed.ok) return toast(parsed.error);
  openSheet(`<h3>Datos de la V2.2</h3><p>He reconocido <b>${plural(parsed.logs.length, 'registro', 'registros')}</b>${parsed.customExercises.length ? ` y ${plural(parsed.customExercises.length, 'ejercicio nuevo', 'ejercicios nuevos')}` : ''}.</p>
    ${parsed.unrecognized.length ? `<div class="note-box"><b>${plural(parsed.unrecognized.length, 'entrada no reconocida', 'entradas no reconocidas')}</b> (no se importarán):<br>${parsed.unrecognized.slice(0, 5).map(u => `· ${esc(u.reason)}: ${esc(u.sample)}`).join('<br>')}</div>` : ''}
    <p class="small muted">Revisa que las cifras te cuadran. Sólo se añaden datos: lo que ya tienes no se toca y los datos antiguos tampoco se borran.</p>
    <button class="btn btn-primary" data-ok ${parsed.logs.length ? '' : 'disabled'}>Importar ${plural(parsed.logs.length, 'registro', 'registros')}</button><div class="spacer"></div><button class="btn btn-ghost" data-close>Cancelar</button>`, async e => {
    if (e.target.closest('[data-close]')) closeSheet();
    if (e.target.closest('[data-ok]')) { const r = await store.importLegacy(parsed); await store.setSetting('legacyImported', true); closeSheet(); toast(`Importados ${r.added} registros${r.skipped ? ` (${r.skipped} ya estaban)` : ''}`); after?.(); }
  });
}

/* ---------- AJUSTES ---------- */
async function renderAjustes() {
  const ver = store.verifiedIds();
  const sections = store.exercises();
  view.innerHTML = `<h1 class="page-title">Ajustes</h1><p class="sub">Lo que no se usa al entrenar vive aquí.</p>
    <div class="eyebrow">Uso sin conexión</div><div class="card last-box" id="offBox"><div class="muted small">Comprobando…</div></div>
    <div class="eyebrow">Máquinas de mi gimnasio</div>
    <p class="small muted" style="margin:0 0 8px">Marca las máquinas que has comprobado que existen en VivaGym Clara del Rey (Santa Rita). Hasta entonces el catálogo es genérico.</p>
    <div id="machines">${sections.map(e => `<button class="list-item" data-ver="${esc(e.id)}"><div class="grow"><div class="t">${esc(e.name)}</div><div class="s">${esc(e.machine || '—')}</div></div><span class="switch ${ver.has(e.id) ? 'on' : ''}" role="switch" aria-checked="${ver.has(e.id)}"></span></button>`).join('')}</div>
    <div class="eyebrow">Mis ejercicios</div>
    <input class="field-text" id="cxName" placeholder="Nombre del ejercicio"><input class="field-text" id="cxMachine" placeholder="Máquina (opcional)">
    <select class="sel" id="cxMuscle" style="margin-bottom:8px">${MUSCLES.filter(m => !m.group).map(m => `<option value="${m.id}">${esc(m.label)}</option>`).join('')}</select>
    <button class="btn btn-secondary" data-addex>Añadir ejercicio</button>
    <div class="eyebrow">Copia de seguridad</div>
    <p class="small muted" style="margin:0 0 8px">Los datos viven sólo en este dispositivo. Haz una copia de vez en cuando; no se sincronizan solos con ningún otro móvil.</p>
    <button class="btn btn-secondary" data-export>Exportar copia (JSON)</button><div class="spacer"></div>
    <label class="btn btn-ghost" style="cursor:pointer">Importar copia…<input type="file" accept="application/json,.json" id="impFile" hidden></label>
    <div class="eyebrow">Datos de la versión anterior (V2.2)</div>
    <p class="small muted" style="margin:0 0 8px">En la app antigua, abre la consola del navegador y ejecuta <code>copy(localStorage.mimiGymDataV1)</code>; pega aquí el resultado. Sólo añade datos, nunca borra los actuales, y te enseña antes lo que ha entendido.</p>
    ${legacyRaw() ? '<button class="btn btn-secondary" data-legacy-local>Usar los datos guardados en este dispositivo</button><div class="spacer"></div>' : ''}
    <textarea class="field-text" id="legacyTxt" placeholder="…o pega aquí el JSON de mimiGymDataV1"></textarea>
    <button class="btn btn-secondary" data-legacy>Analizar datos antiguos</button>
    <div class="eyebrow">Acerca de</div><div class="small muted" id="about">Mimi Gym · los datos no salen de tu dispositivo.</div><div class="spacer"></div>
    <button class="btn btn-ghost" data-update>Buscar actualización</button>`;
  const drawOff = async () => {
    const box = $('#offBox'); if (!box) return;
    try {
      const s = await offline.offlineStatus();
      const label = { ready: 'Listo para entrenar sin conexión', 'shell-only': 'La app funciona sin conexión', partial: 'Descarga incompleta', none: 'Todavía no está disponible sin conexión', unsupported: 'Este navegador no permite uso sin conexión' }[s.state];
      const mb = n => (n / 1048576).toFixed(1).replace('.', ',') + ' MB';
      box.innerHTML = `<div class="row"><b class="grow">${label}</b>${s.state === 'ready' || s.state === 'shell-only' ? `<span class="pill ok">${I.check}</span>` : '<span class="pill">!</span>'}</div>
        ${s.shell ? `<div class="small muted" style="margin-top:6px">App: ${s.shell.ok} de ${s.shell.total} archivos guardados</div>` : ''}
        ${s.media ? `<div class="small muted">Vídeos: ${s.media.total ? `${s.media.ok} de ${s.media.total} descargados${s.media.bytesAll ? ` (${mb(s.media.bytesOk)} de ${mb(s.media.bytesAll)})` : ''}` : 'todavía no hay vídeos validados en esta versión'}</div>` : ''}
        ${s.persisted !== null && s.persisted !== undefined ? `<div class="small muted">Almacenamiento protegido: ${s.persisted ? 'sí' : 'no concedido. iOS podría liberar espacio si hace falta'}</div>` : ''}
        ${s.supported ? `${s.media.total ? '' : '<!--'}<div class="chips" id="scope" style="margin-top:10px">${store.routines.map(r => `<button class="chip on" data-scope="${esc(r.id)}">Rutina ${esc(r.id)}</button>`).join('')}</div>${s.media.total ? '' : '-->'}
        <div id="prog" hidden><div class="progress"><i></i></div><div class="small muted" id="progTxt"></div></div>
        <button class="btn btn-primary" id="prepBtn">Preparar para entrenar sin conexión</button>
        <p class="small muted" style="margin:8px 0 0">Antes de ir al gimnasio, conecta y pulsa el botón. Después puedes comprobarlo poniendo el móvil en modo avión.</p>` : ''}`;
    } catch (err) { box.innerHTML = `<div class="small">No se pudo comprobar el estado: ${esc(err.message || err)}</div>`; }
  };
  drawOff();
  let abort = null;
  view.onclick = async ev => {
    const t = ev.target.closest('button,label'); if (!t) return;
    if (t.dataset.ver) { const on = await store.toggleVerified(t.dataset.ver); const sw = t.querySelector('.switch'); sw.classList.toggle('on', on); sw.setAttribute('aria-checked', on); }
    else if (t.dataset.scope) t.classList.toggle('on');
    else if (t.id === 'prepBtn') {
      if (abort) { abort.abort(); return; }
      abort = new AbortController(); t.textContent = 'Cancelar descarga'; t.classList.replace('btn-primary', 'btn-ghost');
      const only = new Set(store.routines.filter(r => view.querySelector(`[data-scope="${r.id}"]`)?.classList.contains('on')).flatMap(r => r.exerciseIds));
      const all = [...view.querySelectorAll('[data-scope]')].every(c => c.classList.contains('on'));
      $('#prog').hidden = false;
      try {
        const res = await offline.prepare({ onlyIds: all ? null : only, signal: abort.signal, onProgress: p => { $('#prog i').style.width = Math.round(p.done / p.total * 100) + '%'; $('#progTxt').textContent = `Descargando ${p.done} de ${p.total}`; } });
        toast(res.cancelled ? 'Descarga cancelada: el estado real es el que ves abajo' : res.failures.length ? `Descarga con ${res.failures.length} fallo(s). Vuelve a intentarlo con conexión` : 'Descarga terminada');
      } catch (err) { toast('No se pudo descargar: ' + (err.message || err)); }
      abort = null; drawOff();
    }
    else if (t.dataset.addex !== undefined) {
      try { await store.addCustomExercise({ name: $('#cxName').value, machine: $('#cxMachine').value, primary: [$('#cxMuscle').value] }); toast('Ejercicio añadido'); renderAjustes(); } catch (err) { toast(err.message); }
    }
    else if (t.dataset.export !== undefined) {
      const data = await store.exportBackup(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `mimi-gym-copia-${dateKey()}.json`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('Copia exportada');
    }
    else if (t.dataset.legacy !== undefined) legacyReview($('#legacyTxt').value.trim(), renderAjustes);
    else if (t.dataset.legacyLocal !== undefined) legacyReview(legacyRaw(), renderAjustes);
    else if (t.dataset.update !== undefined) {
      const reg = await navigator.serviceWorker?.getRegistration(); if (!reg) return toast('Sin service worker en este navegador');
      try { await reg.update(); toast(reg.waiting ? 'Hay una versión nueva' : 'Ya tienes la última versión'); } catch { toast('No se pudo comprobar. ¿Hay conexión?'); }
    }
  };
  view.onchange = async ev => {
    if (ev.target.id !== 'impFile' || !ev.target.files[0]) return;
    let obj; try { obj = JSON.parse(await ev.target.files[0].text()); } catch { ev.target.value = ''; return toast('El archivo no es un JSON válido'); }
    ev.target.value = '';
    const v = Store.validateBackup(obj);
    if (!v.ok) return openSheet(`<h3>No se puede importar</h3><div class="note-box">${v.errors.map(esc).join('<br>')}</div><button class="btn btn-ghost" data-close>Cerrar</button>`, e => e.target.closest('[data-close]') && closeSheet());
    openSheet(`<h3>Importar copia</h3><p>Contiene ${plural(v.counts.logs, 'registro', 'registros')}, ${plural(v.counts.plans, 'día planificado', 'días planificados')} y ${plural(v.counts.customExercises, 'ejercicio propio', 'ejercicios propios')}.</p>
      <button class="btn btn-primary" data-m="merge">Fusionar con mis datos (recomendado)</button><p class="small muted">Añade lo que falte, sin duplicar ni borrar.</p>
      <button class="btn btn-danger" data-m="replace">Reemplazar todo</button><p class="small muted"><b>Cuidado:</b> sustituye todos tus registros, planes y rutinas actuales por los de la copia.</p>
      <button class="btn btn-ghost" data-close>Cancelar</button>`, async e => {
      if (e.target.closest('[data-close]')) return closeSheet();
      const m = e.target.closest('[data-m]'); if (!m) return;
      if (m.dataset.m === 'replace' && !confirm('Se perderán los datos actuales que no estén en la copia. ¿Seguro?')) return;
      try { const r = await store.importBackup(obj, m.dataset.m); closeSheet(); toast(m.dataset.m === 'merge' ? `Añadidos ${r.added} registros${r.skipped ? ` (${r.skipped} ya estaban)` : ''}` : 'Copia restaurada'); renderAjustes(); } catch (err) { toast(err.message); }
    });
  };
  offline.loadAssetList().then(l => { const a = $('#about'); if (a) a.textContent = `Mimi Gym · versión ${l.version} · los datos no salen de tu dispositivo.`; }).catch(() => {});
}

/* ---------- Arranque ---------- */
function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller; let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadController || reloading) return; reloading = true; location.reload(); });
  const offer = w => toast('Hay una versión nueva de Mimi Gym', { action: () => w.postMessage({ type: 'SKIP_WAITING' }), label: 'Actualizar', sticky: true });
  navigator.serviceWorker.register('sw.js').then(reg => {
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => { const w = reg.installing; w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); }); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(err => console.warn('SW no registrado', err));
}

(async function boot() {
  try {
    await store.init();
    navigator.storage?.persist?.().catch(() => {});
    $('#app').hidden = false;
    if (!location.hash) history.replaceState(null, '', '#/hoy');
    await render();
    setupServiceWorker();
  } catch (err) {
    console.error(err);
    $('#app').hidden = false;
    view.innerHTML = `<div class="empty"><div class="big">No se puede abrir el almacenamiento</div>${esc(err.message || err)}<div class="spacer"></div>Si estás en una ventana privada, prueba en una normal.</div>`;
  } finally {
    const s = $('#splash'); setTimeout(() => { s.classList.add('gone'); setTimeout(() => s.remove(), 300); }, 350);
  }
})();
