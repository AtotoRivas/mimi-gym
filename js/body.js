// Siluetas anatómicas (frontal/posterior) con zonas táctiles. Dibujo propio, sin recursos externos.
// Cada zona se define para el lado izquierdo y se refleja; 'center' = zona única central.
const H = (d) => ({ d, mirror: true });
const C = (d) => ({ d, mirror: false });

// Silueta femenina estilizada: hombros más estrechos, cintura marcada, cadera y muslos con curva.
// Trazado propio en una cuadrícula 200 x 400; cada mitad se refleja.
const BASE_HALF = [
  // tronco + pierna (una sola forma continua, sin costuras)
  'M100 57 L93 58 Q80 61 70 66 Q63 69 62 77 L65 104 Q69 126 73 146 Q75 158 72 170 Q63 184 62 202 Q61 232 65 262 Q67 280 69 292 Q68 322 71 350 Q72 372 73 383 L87 383 Q89 346 92 304 Q95 276 97 246 Q99 230 100 216 Z',
  // brazo completo (hombro, codo, mano)
  'M62 74 Q53 77 51 90 Q49 112 47 136 Q45 160 41 188 Q38 202 40 214 Q46 220 51 213 Q55 196 58 172 Q61 150 63 128 Q66 112 67 100 Z',
];

const DELT = 'M62 75 Q54 78 52 90 Q51 100 56 106 Q63 100 66 88 Q66 79 62 75 Z';
const ARM_F = 'M54 108 Q51 122 50 136 Q56 140 60 134 Q61 120 61 108 Q58 104 54 108 Z';
const ARM_B = 'M54 108 Q51 122 50 136 Q56 140 60 134 Q61 120 61 108 Q58 104 54 108 Z';

export const ZONES = {
  front: {
    pecho: [H('M99 78 Q86 73 73 80 Q69 90 74 100 Q86 108 99 103 Z')],
    hombros: [H(DELT)],
    biceps: [H(ARM_F)],
    abdomen: [C('M88 112 Q100 109 112 112 Q114 140 111 162 Q100 168 89 162 Q86 140 88 112 Z')],
    cuadriceps: [H('M68 212 Q64 240 69 278 Q80 285 90 278 Q93 250 91 218 Q80 207 68 212 Z')],
    aductores: [H('M92 222 Q98 244 98 262 Q95 275 91 280 Q94 252 92 222 Z')],
  },
  back: {
    espalda: [H('M99 60 Q82 63 70 73 Q66 98 71 126 Q84 146 99 151 Z')],
    hombros: [H(DELT)],
    triceps: [H(ARM_B)],
    gluteos: [H('M99 178 Q82 172 68 184 Q61 200 69 217 Q84 226 99 219 Z')],
    abductores: [H('M62 186 Q58 202 63 218 Q67 213 68 198 Q67 190 62 186 Z')],
    isquios: [H('M70 226 Q66 252 70 284 Q82 291 93 284 Q96 255 94 228 Q82 222 70 226 Z')],
    gemelos: [H('M72 300 Q68 326 74 352 Q82 358 90 350 Q94 322 88 301 Q80 296 72 300 Z')],
  },
};

export const VIEW_OF = (() => {
  const m = {};
  for (const v of ['front', 'back']) for (const k of Object.keys(ZONES[v])) if (!m[k]) m[k] = v;
  return m;
})();

const mirrorAttr = 'transform="translate(200 0) scale(-1 1)"';
const shapes = (items, cls, extra = '') => items.map(s =>
  `<path class="${cls}" d="${s.d}" ${extra}/>` + (s.mirror ? `<path class="${cls}" d="${s.d}" ${mirrorAttr} ${extra}/>` : '')).join('');

/**
 * @param view 'front' | 'back'
 * @param opts.selected  Set de músculos resaltados
 * @param opts.interactive  true => zonas pulsables (data-muscle)
 */
export function bodyView(view, { selected = new Set(), interactive = false, label = true, crop = null } = {}) {
  const base = BASE_HALF.map(d => `<path class="b-base" d="${d}"/><path class="b-base" d="${d}" ${mirrorAttr}/>`).join('');
  const head = '<ellipse class="b-base" cx="100" cy="27" rx="14" ry="19"/><path class="b-base" d="M94 42 L106 42 L108 60 L92 60 Z"/>';
  const feet = '<path class="b-base" d="M73 382 Q71 391 77 392 L88 392 Q90 387 87 382 Z"/><path class="b-base" d="M127 382 Q129 391 123 392 L112 392 Q110 387 113 382 Z"/>';
  const zones = Object.entries(ZONES[view]).map(([m, items]) => {
    const on = selected.has(m);
    if (!interactive && !on) return '';
    const cls = 'zone' + (on ? ' on' : '') + (interactive ? ' tap' : '');
    return `<g class="${cls}" data-muscle="${m}">${shapes(items, 'z', interactive ? 'stroke-linejoin="round"' : '')}${interactive ? shapes(items, 'hit') : ''}</g>`;
  }).join('');
  return `<svg class="body body-${view}" viewBox="${crop || '0 0 200 400'}" role="img" aria-label="${view === 'front' ? 'Cuerpo, vista frontal' : 'Cuerpo, vista posterior'}">${base}${head}${feet}${zones}</svg>` +
    (label ? `<div class="body-label">${view === 'front' ? 'Frente' : 'Espalda'}</div>` : '');
}

export function bodyPair(opts) {
  return `<div class="body-pair"><figure>${bodyView('front', opts)}</figure><figure>${bodyView('back', opts)}</figure></div>`;
}

// Miniatura: una sola vista, la del primer músculo principal.
export function thumb(muscles) {
  const view = VIEW_OF[muscles?.[0]] || 'front';
  const m0 = muscles?.[0];
  const crop = m0 === 'gemelos' ? '44 262 112 142'
    : ['gluteos', 'cuadriceps', 'isquios', 'aductores', 'abductores'].includes(m0) ? '44 168 112 142'
    : '38 52 124 158';
  return `<div class="thumb">${bodyView(view, { selected: new Set(muscles), label: false, crop })}</div>`;
}
