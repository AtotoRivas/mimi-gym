// Descarga y verificación REAL del contenido offline. Nunca da por "listo" algo que no está en caché.
export const MEDIA_CACHE = 'mimi-media-v1';
const PREP_HEADER = { 'x-mimi-prepare': '1' }; // el service worker lo deja pasar a red

export async function loadAssetList() {
  const r = await fetch('asset-list.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('No se pudo leer asset-list.json');
  return r.json(); // { version, shell: [{url, bytes}] }
}
export async function loadClips() {
  try { const r = await fetch('media/manifest.json', { cache: 'no-cache' }); return r.ok ? (await r.json()).clips || {} : {}; } catch { return {}; }
}
const clipFiles = (clips, only) => Object.entries(clips)
  .filter(([id]) => !only || only.has(id))
  .flatMap(([id, c]) => [[c.video, c.bytes], [c.poster, c.posterBytes]].filter(([u]) => u).map(([url, bytes]) => ({ id, url, bytes: bytes || 0 })));

export async function offlineStatus() {
  const out = { supported: 'caches' in globalThis && 'serviceWorker' in navigator, controlled: !!navigator.serviceWorker?.controller };
  if (!out.supported) return { ...out, state: 'unsupported' };
  const list = await loadAssetList(); const clips = await loadClips();
  const shellCache = await caches.open('mimi-shell-' + list.version);
  let shellOk = 0; for (const f of list.shell) if (await shellCache.match(f.url)) shellOk++;
  const mediaCache = await caches.open(MEDIA_CACHE);
  const files = clipFiles(clips);
  let mediaOk = 0, bytesOk = 0, bytesAll = 0;
  for (const f of files) { bytesAll += f.bytes; if (await mediaCache.match(f.url)) { mediaOk++; bytesOk += f.bytes; } }
  const persisted = (await navigator.storage?.persisted?.().catch(() => null)) ?? null;
  const shellReady = shellOk === list.shell.length;
  let state;
  if (!shellReady) state = shellOk ? 'partial' : 'none';
  else if (!files.length) state = 'shell-only';      // app lista; todavía no hay vídeos que descargar
  else state = mediaOk === files.length ? 'ready' : 'partial';
  return { ...out, version: list.version, shell: { ok: shellOk, total: list.shell.length }, media: { ok: mediaOk, total: files.length, bytesOk, bytesAll }, persisted, state };
}

/** @param onlyIds Set de ids de ejercicio (o null = todos). Devuelve el estado real final. */
export async function prepare({ onlyIds = null, onProgress = () => {}, signal } = {}) {
  if (!('caches' in globalThis) || !navigator.serviceWorker) throw new Error('Este navegador no permite uso sin conexión');
  await navigator.serviceWorker.ready;
  navigator.storage?.persist?.().catch(() => {});
  const list = await loadAssetList(); const clips = await loadClips();
  const shellCache = await caches.open('mimi-shell-' + list.version);
  const mediaCache = await caches.open(MEDIA_CACHE);
  const jobs = [
    ...list.shell.map(f => ({ cache: shellCache, url: f.url, bytes: f.bytes })),
    ...clipFiles(clips, onlyIds).map(f => ({ cache: mediaCache, url: f.url, bytes: f.bytes })),
  ];
  const failures = []; let done = 0;
  for (const j of jobs) {
    if (signal?.aborted) break;
    try {
      if (!(await j.cache.match(j.url))) {
        const res = await fetch(j.url, { headers: PREP_HEADER, cache: 'reload', signal });
        if (!res.ok || res.status !== 200) throw new Error('HTTP ' + res.status);
        const blob = await res.blob();
        if (j.bytes && Math.abs(blob.size - j.bytes) > Math.max(16, j.bytes * 0.01)) throw new Error('tamaño inesperado');
        await j.cache.put(j.url, new Response(blob, { headers: { 'content-type': res.headers.get('content-type') || 'application/octet-stream' } }));
      }
    } catch (e) {
      if (e.name === 'AbortError') break;
      failures.push({ url: j.url, error: String(e.message || e) });
    }
    onProgress({ done: ++done, total: jobs.length, current: j.url });
  }
  const status = await offlineStatus();
  return { ...status, failures, cancelled: !!signal?.aborted };
}
