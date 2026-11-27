/* N.O.V.A — service worker : l'appli marche sans Internet, les fichiers « _blob/<id> » viennent du téléphone,
   et une nouvelle version n'est activée que quand Joka touche « Mettre à jour ». */
const VERSION = "nova-2.4.0";
const COQUE = [
  "./", "index.html", "manifest.webmanifest",
  "css/v1.css", "css/nova.css",
  "js/store.js", "js/shim.js", "js/coeur.js", "js/cerveau.js", "js/recherche.js", "js/agent.js", "js/haptique.js", "js/sauvegarde.js", "js/evolution.js", "js/shell.js", "js/v1.js",
  "vendor/jspdf.umd.min.js", "vendor/core3d.js",
  "fonts/saira-latin-standard-normal.woff2", "fonts/michroma-latin-400-normal.woff2",
  "icons/icone-192.png", "icons/icone-512.png", "icons/icone-masquable-512.png", "icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(COQUE.map((u) => new Request(u, { cache: "reload" })))));
  /* pas de skipWaiting automatique : on attend l'accord de Joka (message « activer ») */
});
self.addEventListener("message", (e) => { if (e.data === "activer") self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

/* fichiers stockés dans IndexedDB « nova » / « blobs » */
function lireBlob(id) {
  return new Promise((ok) => {
    const r = indexedDB.open("nova");
    r.onerror = () => ok(null);
    r.onsuccess = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("blobs")) { db.close(); ok(null); return; }
      const g = db.transaction("blobs", "readonly").objectStore("blobs").get(id);
      g.onsuccess = () => { ok(g.result || null); db.close(); };
      g.onerror = () => { ok(null); db.close(); };
    };
  });
}

self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (u.origin !== self.location.origin || e.request.method !== "GET") return; /* cerveaux en ligne, ntfy : réseau direct */
  const m = /\/_blob\/([0-9a-f]{16,64})$/.exec(u.pathname);
  if (m) {
    e.respondWith(lireBlob(m[1]).then((b) => b ? new Response(b.blob, { headers: { "Content-Type": b.type || "application/octet-stream" } }) : new Response("fichier introuvable", { status: 404 })));
    return;
  }
  /* la coque : cache d'abord (marche hors ligne), réseau en secours */
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    const hit = await c.match(e.request, { ignoreSearch: true }) || (e.request.mode === "navigate" ? await c.match("index.html") : null);
    if (hit) return hit;
    try { const r = await fetch(e.request); if (r.ok && r.type === "basic") c.put(e.request, r.clone()); return r; }
    catch (err) { return new Response("hors ligne", { status: 503 }); }
  })());
});
