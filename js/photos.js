// Fotos de máquinas y búsqueda de parecidos. Todo ocurre en el móvil: sin servicios externos ni costes.

const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(['de', 'del', 'la', 'el', 'en', 'con', 'a', 'al', 'y', 'maquina', 'polea', 'banco', 'the', 'machine']);
const words = s => new Set(norm(s).split(' ').filter(w => w.length > 2 && !STOP.has(w)));

/** Ejercicios del catálogo que se parecen a un nombre/máquina escritos por Mimi. Más parecido primero. */
export function findMatches(exercises, { name = '', machine = '' } = {}, limit = 3) {
  const qa = words(name), qm = words(machine);
  if (!qa.size && !qm.size) return [];
  const jac = (a, b) => { if (!a.size || !b.size) return 0; let i = 0; a.forEach(w => b.has(w) && i++); return i / (a.size + b.size - i); };
  const score = e => {
    if (norm(e.name) && norm(e.name) === norm(name)) return 1;
    const en = words(e.name), em = words(e.machine);
    return Math.max(jac(qa, en), jac(qm, em) * 0.9, jac(qa, em) * 0.9, jac(qm, en) * 0.9);
  };
  return exercises.map(e => ({ e, s: score(e) })).filter(x => x.s >= 0.5).sort((a, b) => b.s - a.s).slice(0, limit).map(x => x.e);
}

/** Reduce una foto a JPEG de lado máximo `max` px (en el móvil una foto pesa 3–5 MB; así ~100–200 KB). */
export async function shrinkPhoto(file, max = 1024, quality = 0.8) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('No se ha podido leer la imagen')); i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  } finally { URL.revokeObjectURL(url); }
}
