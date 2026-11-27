/* N.O.V.A — mémoire locale du téléphone (IndexedDB).
   Tout reste dans l'iPhone : documents (même chemins que l'artefact), fichiers (blobs) et réglages.
   L'API imite la base de l'artefact (doc / collection / get / set / update / delete / orderBy / limit / where / onSnapshot)
   pour que le code de N.O.V.A v1 tourne sans changement. */
(function () {
  "use strict";
  const NOM = "nova", VERSION = 1;
  let base = null;
  const docs = new Map();           // chemin complet → {path, parent, id, data, updatedAt}
  const ecouteurs = new Set();      // {type:"doc"|"query", path, q, cb, err}
  let pret = null;

  const clone = (v) => (v === undefined ? undefined : (typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v))));
  const parentDe = (p) => p.slice(0, p.lastIndexOf("/"));
  const idDe = (p) => p.slice(p.lastIndexOf("/") + 1);
  const segs = (p) => String(p).split("/").filter(Boolean);

  function ouvrir() {
    if (pret) return pret;
    pret = new Promise((ok, ko) => {
      const r = indexedDB.open(NOM, VERSION);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains("docs")) db.createObjectStore("docs", { keyPath: "path" }).createIndex("parent", "parent");
        if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs", { keyPath: "id" });
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv", { keyPath: "k" });
      };
      r.onsuccess = () => {
        base = r.result;
        const t = base.transaction("docs").objectStore("docs").getAll();
        t.onsuccess = () => { for (const d of t.result) docs.set(d.path, d); ok(); };
        t.onerror = () => ko(t.error);
      };
      r.onerror = () => ko(r.error);
    });
    return pret;
  }

  function tx(store, mode, fn) {
    return new Promise((ok, ko) => {
      const t = base.transaction(store, mode);
      const res = fn(t.objectStore(store));
      t.oncomplete = () => ok(res && res.result !== undefined ? res.result : undefined);
      t.onerror = () => ko(t.error);
      t.onabort = () => ko(t.error || new Error("écriture annulée"));
    });
  }

  /* ---------- notifications ---------- */
  let aNotifier = new Set(), planifie = false;
  function changement(path) {
    aNotifier.add(path);
    if (planifie) return;
    planifie = true;
    queueMicrotask(() => {
      planifie = false;
      const chemins = aNotifier; aNotifier = new Set();
      for (const e of [...ecouteurs]) {
        if (e.type === "doc" ? chemins.has(e.path) : [...chemins].some((c) => parentDe(c) === e.path)) livrer(e);
      }
    });
  }
  function livrer(e) {
    try { e.cb(e.type === "doc" ? snapDoc(e.path) : snapQuery(e.path, e.q)); }
    catch (err) { console.error("N.O.V.A — écouteur :", err); }
  }

  /* ---------- instantanés ---------- */
  function snapDoc(path) {
    const d = docs.get(path);
    return { id: idDe(path), exists: !!d, ref: new DocRef(path), data: () => (d ? clone(d.data) : undefined), get: (k) => (d ? clone(d.data[k]) : undefined) };
  }
  function comparer(a, b) {
    if (a === b) return 0;
    if (a === undefined || a === null) return 1;
    if (b === undefined || b === null) return -1;
    return a < b ? -1 : 1;
  }
  const OPS = {
    "==": (a, b) => a === b, eq: (a, b) => a === b, "!=": (a, b) => a !== b, ne: (a, b) => a !== b,
    "<": (a, b) => a < b, lt: (a, b) => a < b, "<=": (a, b) => a <= b, lte: (a, b) => a <= b,
    ">": (a, b) => a > b, gt: (a, b) => a > b, ">=": (a, b) => a >= b, gte: (a, b) => a >= b,
    in: (a, b) => Array.isArray(b) && b.includes(a), "not-in": (a, b) => Array.isArray(b) && !b.includes(a),
    "array-contains": (a, b) => Array.isArray(a) && a.includes(b),
  };
  function snapQuery(path, q) {
    let l = [...docs.values()].filter((d) => d.parent === path);
    for (const w of q.where) l = l.filter((d) => OPS[w.op] && OPS[w.op](d.data[w.field], w.value));
    if (q.orderBy.length) {
      l.sort((x, y) => {
        for (const o of q.orderBy) {
          const c = comparer(x.data[o.field], y.data[o.field]);
          if (c) return o.dir === "desc" ? (x.data[o.field] == null || y.data[o.field] == null ? c : -c) : c;
        }
        return 0;
      });
    } else l.sort((x, y) => comparer(x.id, y.id));
    if (q.limit != null) l = l.slice(0, q.limit);
    const docsSnap = l.map((d) => ({ id: d.id, exists: true, ref: new DocRef(d.path), data: () => clone(d.data), get: (k) => clone(d.data[k]) }));
    return { docs: docsSnap, size: docsSnap.length, empty: !docsSnap.length, forEach: (f) => docsSnap.forEach(f) };
  }

  /* ---------- écritures ---------- */
  async function ecrire(path, data) {
    await ouvrir();
    const d = { path, parent: parentDe(path), id: idDe(path), data: clone(data), updatedAt: Date.now() };
    docs.set(path, d);
    changement(path);
    await tx("docs", "readwrite", (s) => s.put(d));
  }
  async function effacer(path) {
    await ouvrir();
    docs.delete(path);
    changement(path);
    await tx("docs", "readwrite", (s) => s.delete(path));
  }

  class DocRef {
    constructor(path) {
      if (segs(path).length % 2) throw new Error("chemin de document invalide : " + path);
      this.path = segs(path).join("/"); this.id = idDe(this.path);
    }
    collection(nom) { return new Query(this.path + "/" + nom); }
    async get() { await ouvrir(); return snapDoc(this.path); }
    async set(data, opts) {
      const cur = docs.get(this.path);
      await ecrire(this.path, opts && opts.merge && cur ? Object.assign(clone(cur.data), data) : data);
    }
    async update(part) {
      const cur = docs.get(this.path);
      const suite = cur ? clone(cur.data) : {};
      for (const [k, v] of Object.entries(part || {})) {
        if (k.includes(".")) { // champ imbriqué « a.b »
          const ks = k.split("."); let o = suite;
          ks.slice(0, -1).forEach((x) => { o[x] = o[x] && typeof o[x] === "object" ? o[x] : {}; o = o[x]; });
          if (v === undefined) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = v;
        } else if (v === undefined) delete suite[k]; else suite[k] = v;
      }
      await ecrire(this.path, suite);
    }
    async delete() { await effacer(this.path); }
    onSnapshot(cb, err) {
      const e = { type: "doc", path: this.path, cb, err };
      ecouteurs.add(e);
      ouvrir().then(() => ecouteurs.has(e) && livrer(e)).catch((x) => err && err(x));
      return () => ecouteurs.delete(e);
    }
  }

  class Query {
    constructor(path, q) {
      this.path = segs(path).join("/");
      this.q = q || { where: [], orderBy: [], limit: null };
      this.id = idDe(this.path);
    }
    _avec(m) { return new Query(this.path, Object.assign({ where: [...this.q.where], orderBy: [...this.q.orderBy], limit: this.q.limit }, m)); }
    doc(id) { return new DocRef(this.path + "/" + (id || nouvelId())); }
    where(field, op, value) {
      if (field && typeof field === "object") {
        const ws = Array.isArray(field) ? field : Object.entries(field).map(([f, v]) => ({ field: f, op: "==", value: v }));
        return this._avec({ where: [...this.q.where, ...ws] });
      }
      return this._avec({ where: [...this.q.where, { field, op, value }] });
    }
    orderBy(field, dir) {
      if (field && typeof field === "object") return this._avec({ orderBy: [...this.q.orderBy, { field: field.field, dir: field.direction || "asc" }] });
      if (typeof field === "string" && field[0] === "-") return this._avec({ orderBy: [...this.q.orderBy, { field: field.slice(1), dir: "desc" }] });
      return this._avec({ orderBy: [...this.q.orderBy, { field, dir: dir === "desc" ? "desc" : "asc" }] });
    }
    limit(n) { return this._avec({ limit: Math.max(0, n | 0) }); }
    async get() { await ouvrir(); return snapQuery(this.path, this.q); }
    async add(data) { const r = this.doc(); await r.set(data); return r; }
    onSnapshot(cb, err) {
      const e = { type: "query", path: this.path, q: this.q, cb, err };
      ecouteurs.add(e);
      ouvrir().then(() => ecouteurs.has(e) && livrer(e)).catch((x) => err && err(x));
      return () => ecouteurs.delete(e);
    }
  }
  const nouvelId = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(16).padStart(2, "0")).join("");

  /* ---------- fichiers (blobs) ---------- */
  const hex32 = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  async function blobMettre(blob, opts) {
    await ouvrir();
    const id = (opts && opts.id) || hex32();
    const type = (opts && opts.type) || blob.type || "application/octet-stream";
    const b = blob instanceof Blob ? blob : new Blob([blob], { type });
    await tx("blobs", "readwrite", (s) => s.put({ id, type, blob: b, size: b.size, created: Date.now() }));
    return { id, url: "_blob/" + id, type, size: b.size };
  }
  async function blobLire(id) { await ouvrir(); return tx("blobs", "readonly", (s) => s.get(id)); }
  async function blobEffacer(id) { await ouvrir(); return tx("blobs", "readwrite", (s) => s.delete(id)); }
  async function blobsListe() { await ouvrir(); return tx("blobs", "readonly", (s) => s.getAll()); }

  /* ---------- réglages ---------- */
  async function kvLire(k, defaut) { await ouvrir(); const r = await tx("kv", "readonly", (s) => s.get(k)); return r ? r.v : defaut; }
  async function kvMettre(k, v) { await ouvrir(); return tx("kv", "readwrite", (s) => s.put({ k, v })); }

  /* ---------- outils pour la coque ---------- */
  function tous(prefixe) { return [...docs.values()].filter((d) => !prefixe || d.path.startsWith(prefixe)).map((d) => ({ path: d.path, id: d.id, data: clone(d.data), updatedAt: d.updatedAt })); }
  function compter(prefixe) { let n = 0; for (const d of docs.values()) if (!prefixe || d.path.startsWith(prefixe)) n++; return n; }
  async function toutEffacer() {
    await ouvrir();
    const chemins = [...docs.keys()];
    docs.clear();
    await tx("docs", "readwrite", (s) => s.clear());
    await tx("blobs", "readwrite", (s) => s.clear());
    chemins.forEach(changement);
  }
  async function stockage() {
    try {
      const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : {};
      const persiste = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false;
      return { utilise: est.usage || 0, quota: est.quota || 0, persiste };
    } catch (e) { return { utilise: 0, quota: 0, persiste: false }; }
  }
  async function demanderPersistance() {
    try { return navigator.storage && navigator.storage.persist ? await navigator.storage.persist() : false; } catch (e) { return false; }
  }

  window.NovaStore = {
    ouvrir, doc: (p) => new DocRef(p), collection: (p) => new Query(p),
    blobMettre, blobLire, blobEffacer, blobsListe, kvLire, kvMettre,
    tous, compter, toutEffacer, stockage, demanderPersistance, ecrireBrut: ecrire,
  };
})();
