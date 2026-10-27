// Siluetas anatómicas (frontal/posterior) con zonas táctiles. Dibujo propio, sin recursos externos.
// Cada zona se define para el lado izquierdo y se refleja; 'center' = zona única central.
const H = (d) => ({ d, mirror: true });
const C = (d) => ({ d, mirror: false });

const BASE_HALF = [
  'M100 58 L92 58 Q76 59 62 68 Q52 74 52 90 L56 130 Q58 160 62 190 L64 198 L100 202 Z',           // torso
  'M54 70 Q42 74 40 90 L37 136 Q37 146 46 146 L55 146 Q59 140 59 132 L62 92 Q62 76 54 70 Z',       // brazo
  'M38 148 L33 198 Q33 206 41 206 L50 204 Q54 200 54 194 L56 148 Z',                                // antebrazo
  'M64 198 L100 202 L99 292 Q84 298 70 292 L62 238 Q60 216 64 198 Z',                               // muslo
  'M71 298 Q85 302 97 298 L93 374 Q92 386 86 386 L77 386 Q72 386 72 374 Z',                         // pierna
  'M63 186 L100 186 L100 208 L62 208 Z',                                                            // pelvis (sin costuras)
  'M69 286 L99 286 L97 304 L71 304 Z',                                                              // rodilla
  'M44 140 L56 140 L55 152 L42 152 Z',                                                              // codo
];

const DELT = 'M52 72 Q58 66 65 70 L66 98 Q58 102 53 98 Q49 86 52 72 Z';
const ARM = 'M44 106 Q51 102 57 106 L57 136 Q50 140 44 136 Z';

export const ZONES = {
  front: {
    pecho: [H('M64 74 Q80 66 99 72 L99 108 Q82 114 66 106 Z')],
    hombros: [H(DELT)],
    biceps: [H(ARM)],
    abdomen: [C('M78 114 L122 114 L121 182 Q100 190 79 182 Z')],
    cuadriceps: [H('M67 206 L88 206 Q86 240 90 280 Q80 284 74 280 L66 238 Q65 220 67 206 Z')],
    aductores: [H('M88 206 L99 204 L98 268 Q93 274 90 280 Q86 240 88 206 Z')],
  },
  back: {
    espalda: [C('M64 68 Q100 60 136 68 L133 118 Q128 152 118 170 L82 170 Q72 152 67 118 Z')],
    hombros: [H(DELT)],
    triceps: [H(ARM)],
    gluteos: [H('M68 180 Q84 174 99 182 L99 216 Q80 226 66 212 Q62 194 68 180 Z')],
    abductores: [H('M56 178 Q62 174 67 180 Q62 196 66 212 L60 216 Q53 196 56 178 Z')],
    isquios: [H('M66 228 L98 228 L96 290 Q84 296 72 290 L63 244 Q62 234 66 228 Z')],
    gemelos: [H('M72 300 Q84 304 96 300 L93 352 Q84 358 76 352 Z')],
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
  const head = '<ellipse class="b-base" cx="100" cy="28" rx="16" ry="20"/><rect class="b-base" x="92" y="44" width="16" height="16" rx="4"/>';
  const feet = '<ellipse class="b-base" cx="82" cy="392" rx="11" ry="5"/><ellipse class="b-base" cx="118" cy="392" rx="11" ry="5"/>';
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
  const lower = ['gluteos', 'cuadriceps', 'isquios', 'aductores', 'abductores', 'gemelos'].includes(muscles?.[0]);
  const crop = lower ? '28 168 144 226' : '24 40 152 170';
  return `<div class="thumb">${bodyView(view, { selected: new Set(muscles), label: false, crop })}</div>`;
}
