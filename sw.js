// Service worker de Mimi Gym. VERSION la estampa build.mjs (hash del contenido): cada cambio => caché nueva.
const VERSION = 'ca9431923a';
const SHELL = 'mimi-shell-' + VERSION;
const MEDIA = 'mimi-media-v1'; // los vídeos descargados sobreviven a las actualizaciones de la app
const scope = self.registration.scope;
const abs = u => new URL(u, scope).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const res = await fetch('asset-list.json', { cache: 'reload' });
    if (!res.ok) throw new Error('asset-list.json no disponible');
    const list = await res.json();
    // Si el despliegue está a medias (sw.js nuevo con archivos viejos o al revés), NO se instala: la versión anterior sigue funcionando.
    if (list.version !== VERSION) throw new Error('Versión inconsistente: ' + list.version + ' != ' + VERSION);
    const cache = await caches.open(SHELL);
    for (const f of list.shell) {
      const r = await fetch(f.url, { cache: 'reload' });
      if (!r.ok) throw new Error('No se pudo descargar ' + f.url);
      await cache.put(abs(f.url), r);
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('mimi-shell-') && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data?.type === 'SKIP_WAITING') self.skipWaiting(); });

async function rangeResponse(req, res) {
  const h = req.headers.get('range'); if (!h) return res;
  const blob = await res.blob(); const m = /bytes=(\d*)-(\d*)/.exec(h); if (!m) return res;
  let s, e;
  if (m[1] === '') { s = Math.max(0, blob.size - Number(m[2])); e = blob.size - 1; }
  else { s = Number(m[1]); e = m[2] === '' ? blob.size - 1 : Math.min(Number(m[2]), blob.size - 1); }
  if (s > e || s >= blob.size) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + blob.size } });
  return new Response(blob.slice(s, e + 1), { status: 206, statusText: 'Partial Content', headers: {
    'Content-Type': res.headers.get('Content-Type') || 'video/mp4', 'Content-Range': `bytes ${s}-${e}/${blob.size}`, 'Content-Length': String(e - s + 1), 'Accept-Ranges': 'bytes' } });
}

self.addEventListener('fetch', event => {
  const req = event.request; const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (req.headers.get('x-mimi-prepare')) return; // descarga explícita: directo a red

  const rel = url.pathname.slice(new URL(scope).pathname.length);
  const isMedia = rel.startsWith('media/') && rel !== 'media/manifest.json';

  event.respondWith((async () => {
    if (isMedia) {
      const hit = await (await caches.open(MEDIA)).match(abs(rel));
      if (hit) return rangeResponse(req, hit);
      try { return await fetch(req); } catch { return new Response('Vídeo no descargado', { status: 503 }); }
    }
    const shell = await caches.open(SHELL);
    if (req.mode === 'navigate') {
      const page = await shell.match(abs('index.html'));
      if (page) return page;
      try { return await fetch(req); } catch { return new Response('Sin conexión y sin caché', { status: 503 }); }
    }
    const hit = await shell.match(abs(rel), { ignoreSearch: true });
    if (hit) return hit;
    try { return await fetch(req); } catch { return new Response('Sin conexión', { status: 503 }); }
  })());
});
