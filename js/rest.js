// Temporizador de descanso. Global: sigue contando aunque Mimi cambie de pantalla.
// Cuenta contra la hora real (endAt), no contra ticks: si iOS congela la app en segundo plano,
// al volver se recalcula y, si ya ha terminado, avisa en ese momento.
// Limitaciones de iPhone: una web no puede vibrar ni ejecutar nada con la app cerrada o la pantalla
// bloqueada (no hay notificaciones programadas sin servidor). Por eso se mantiene la pantalla encendida
// durante el descanso y el aviso principal es visual (doble destello a pantalla completa).
// Música: con la Audio Session API (Safari iOS 16.4+) los pitidos se marcan como sonido "transitorio",
// que suena por encima de la música y puede bajarle el volumen mientras suena; después se vuelve a "ambient"
// (mezcla sin tocar la música). Sin esa API, los pitidos se mezclan con la música sin bajarla.

export const REST_OPTIONS = [30, 45, 60, 75, 90, 120, 150, 180, 240];
export const DEFAULT_REST = { sec: 90, sound: true };
export const fmtClock = s => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

let st = null;          // { endAt, total, sound, iv, done }
let audio = null;       // AudioContext (se crea al tocar "Empezar": iOS sólo deja sonar tras un gesto)
let wake = null;        // Screen Wake Lock: evita que la pantalla se apague durante el descanso
let pill = null, flash = null;

const now = () => Date.now();
const el = id => document.getElementById(id);

function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    setSession('ambient'); // preparar el audio no debe parar ni bajar la música
    audio ??= new AC();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    // Un sonido inaudible dentro del gesto deja el contexto desbloqueado en iOS.
    const o = audio.createOscillator(), g = audio.createGain(); g.gain.value = 0; o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + 0.01);
  } catch {}
}
export const BEEPS = 6;
const setSession = type => { try { if (navigator.audioSession) navigator.audioSession.type = type; } catch {} };
function beep() {
  try {
    if (!audio) return;
    setSession('transient'); // por encima de la música, bajándola (si iOS lo permite)
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    const t0 = audio.currentTime + 0.05;
    for (let k = 0; k < BEEPS; k++) {
      const dt = k * 0.34, o = audio.createOscillator(), g = audio.createGain();
      o.type = 'sine'; o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t0 + dt); g.gain.exponentialRampToValueAtTime(0.9, t0 + dt + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.24);
      o.connect(g).connect(audio.destination); o.start(t0 + dt); o.stop(t0 + dt + 0.26);
    }
    setTimeout(() => setSession('ambient'), (BEEPS * 0.34 + 0.6) * 1000); // la música vuelve a su volumen
  } catch {}
}
async function keepAwake(on) {
  try {
    if (on && !wake && navigator.wakeLock) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener?.('release', () => { wake = null; }); }
    if (!on && wake) { await wake.release(); wake = null; }
  } catch { wake = null; }
}

function draw() {
  pill ??= el('rest'); if (!pill) return;
  if (!st) { pill.hidden = true; pill.innerHTML = ''; return; }
  pill.hidden = false;
  if (st.done) {
    pill.className = 'rest-pill done';
    pill.innerHTML = `<span class="rest-label">Descanso terminado</span><button type="button" data-rest="close" aria-label="Cerrar">✕</button>`;
    return;
  }
  const left = (st.endAt - now()) / 1000;
  const pct = Math.max(0, Math.min(1, left / st.total));
  pill.className = 'rest-pill';
  if (!pill.querySelector('.rest-time')) {
    pill.innerHTML = `<i class="rest-bar"><b></b></i><span class="rest-label">Descanso</span><span class="rest-time" role="timer" aria-live="off"></span>
      <button type="button" data-rest="-15" aria-label="Quitar 15 segundos">−15</button><button type="button" data-rest="+15" aria-label="Añadir 15 segundos">+15</button><button type="button" data-rest="close" aria-label="Parar descanso">✕</button>`;
  }
  pill.querySelector('.rest-time').textContent = fmtClock(left);
  pill.querySelector('.rest-bar b').style.width = (pct * 100).toFixed(1) + '%';
}

function finish() {
  if (!st || st.done) return;
  clearInterval(st.iv); st.done = true; keepAwake(false);
  flash ??= el('flash');
  if (flash) { flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); }
  if (st.sound) beep();
  try { navigator.vibrate?.([180, 120, 180]); } catch {} // Android; en iPhone no existe
  draw();
  const mine = st; setTimeout(() => { if (st === mine) stop(); }, 8000);
}
function tick() { if (!st || st.done) return; if (st.endAt - now() <= 0) finish(); else draw(); }

export function start(sec, { sound = true } = {}) {
  if (st) clearInterval(st.iv);
  if (sound) unlockAudio();
  st = { endAt: now() + sec * 1000, total: sec, sound, done: false, iv: setInterval(tick, 250) };
  keepAwake(true); draw();
}
export function adjust(delta) { if (!st || st.done) return; st.endAt = Math.max(now() + 1000, st.endAt + delta * 1000); st.total = Math.max(st.total, (st.endAt - now()) / 1000); tick(); }
export function stop() { if (!st) return; clearInterval(st.iv); st = null; keepAwake(false); draw(); }
export const running = () => !!st && !st.done;

export function setup() {
  pill = el('rest'); flash = el('flash');
  pill?.addEventListener('click', e => {
    const b = e.target.closest('[data-rest]'); if (!b) return;
    const a = b.dataset.rest; if (a === 'close') stop(); else adjust(Number(a));
  });
  flash?.addEventListener('animationend', () => flash.classList.remove('go'));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && st) { tick(); if (!st?.done) keepAwake(true); } });
}
