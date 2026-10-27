// Progreso por ejercicio: serie diaria + gráfico SVG (sin librerías). Independiente del DOM: se prueba en Node.

/** Un punto por día entrenado. kg = el mayor peso del día; reps = repeticiones totales del día. */
export function progressSeries(logs, metric = 'kg') {
  const byDate = new Map();
  for (const l of logs) {
    const d = byDate.get(l.date) || { date: l.date, kg: 0, reps: 0, sets: 0 };
    for (const s of l.sets) { d.kg = Math.max(d.kg, s.kg); d.reps += s.reps; d.sets++; }
    byDate.set(l.date, d);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({ date: d.date, value: metric === 'reps' ? d.reps : d.kg, kg: d.kg, reps: d.reps, sets: d.sets }));
}

/** Marcas del eje Y redondas (1, 2, 2,5, 5, 10…) que envuelven [min, max]. */
export function niceScale(min, max, ticks = 4) {
  if (!(max > min)) { const pad = Math.max(1, Math.abs(max) * 0.1); min -= pad; max += pad; }
  const raw = (max - min) / (ticks - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || 10 * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const out = []; for (let v = lo; v <= hi + step / 1e6; v += step) out.push(Math.round(v * 100) / 100);
  return { lo, hi, step, ticks: out };
}

const DAY = 864e5;
const t = k => Date.parse(k + 'T12:00:00Z');

/** Geometría del gráfico (coordenadas en el viewBox). */
export function layout(series, { w = 340, h = 190, l = 36, r = 62, top = 16, b = 26 } = {}) {
  const vals = series.map(p => p.value);
  const sc = niceScale(Math.min(...vals), Math.max(...vals));
  const t0 = t(series[0].date), t1 = t(series.at(-1).date), span = Math.max(DAY, t1 - t0);
  const x = k => l + (t(k) - t0) / span * (w - l - r);
  const y = v => top + (sc.hi - v) / (sc.hi - sc.lo) * (h - top - b);
  return { w, h, l, r, top, b, sc, pts: series.map(p => ({ ...p, x: x(p.date), y: y(p.value) })), y };
}

/** SVG del gráfico. `fmtV` formatea valores, `fmtD` fechas cortas. */
export function chartSvg(series, { unit = '', fmtV = String, fmtD = String, label = '' } = {}) {
  const g = layout(series);
  const { w, h, l, r, top, b, sc, pts } = g;
  const base = h - b;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('');
  const area = `${line}L${pts.at(-1).x.toFixed(1)},${base}L${pts[0].x.toFixed(1)},${base}Z`;
  const grid = sc.ticks.map(v => `<line class="pg-grid" x1="${l}" x2="${w - r + 4}" y1="${g.y(v).toFixed(1)}" y2="${g.y(v).toFixed(1)}"/><text class="pg-tick" x="${l - 6}" y="${(g.y(v) + 3.5).toFixed(1)}" text-anchor="end">${fmtV(v)}</text>`).join('');
  const last = pts.at(-1);
  const gid = 'pg' + Math.random().toString(36).slice(2, 8);
  // Zonas táctiles: cada punto se queda con su franja vertical (hasta la mitad de sus vecinos).
  const hits = pts.map((p, i) => {
    const x0 = i ? (pts[i - 1].x + p.x) / 2 : l, x1 = i < pts.length - 1 ? (p.x + pts[i + 1].x) / 2 : w;
    return `<rect class="pg-hit" data-i="${i}" x="${x0.toFixed(1)}" y="0" width="${Math.max(1, x1 - x0).toFixed(1)}" height="${h}"/>`;
  }).join('');
  return `<svg class="pg-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#263F35" stop-opacity=".16"/><stop offset="1" stop-color="#263F35" stop-opacity="0"/></linearGradient></defs>
    ${grid}
    <path class="pg-area" d="${area}" fill="url(#${gid})"/>
    <path class="pg-line" d="${line}"/>
    <line class="pg-cross" x1="0" x2="0" y1="${top - 6}" y2="${base}" visibility="hidden"/>
    ${pts.map((p, i) => `<circle class="pg-dot${i === pts.length - 1 ? ' last' : ''}" data-i="${i}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${i === pts.length - 1 ? 5 : 4}"/>`).join('')}
    <text class="pg-end" x="${(last.x + 10).toFixed(1)}" y="${(last.y + 4).toFixed(1)}" text-anchor="start">${fmtV(last.value)}${unit ? ' ' + unit : ''}</text>
    <text class="pg-tick" x="${pts[0].x.toFixed(1)}" y="${h - 6}" text-anchor="start">${fmtD(pts[0].date)}</text>
    ${pts.length > 1 ? `<text class="pg-tick" x="${last.x.toFixed(1)}" y="${h - 6}" text-anchor="middle">${fmtD(last.date)}</text>` : ''}
    ${hits}
  </svg>`;
}
