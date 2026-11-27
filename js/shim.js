/* N.O.V.A — remplace les capacités de l'artefact Claude (window.claude.use) par celles du téléphone.
   db → IndexedDB · assets → fichiers dans le téléphone · downloads → partage / téléchargement
   sample → cerveau de N.O.V.A (en ligne ou local) · mcp.fire_trigger → réveil de l'agent dans l'appli
   artifact.publish → sauvegarde du planning dans le téléphone. */
(function () {
  "use strict";
  const S = window.NovaStore;
  const UID = "me";

  const db = { doc: (p) => S.doc(p), collection: (p) => S.collection(p) };
  const user = { id: async () => UID, name: async () => "Joka" };

  const assets = {
    async upload(blob, opts) { const r = await S.blobMettre(blob, opts); return { id: r.id, url: r.url }; },
    async delete(id) { await S.blobEffacer(id); },
    async list() { return (await S.blobsListe()).map((b) => ({ id: b.id, type: b.type, size: b.size })); },
  };

  async function enregistrer(nom, blob) {
    const fichier = new File([blob], nom, { type: blob.type || "application/octet-stream" });
    if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
      try { await navigator.share({ files: [fichier], title: nom }); return; }
      catch (e) { if (e && e.name === "AbortError") throw Object.assign(new Error("partage annulé"), { code: "cancelled" }); }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = nom; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  }
  const downloads = { save: async ({ filename, data }) => enregistrer(filename || "nova.bin", data instanceof Blob ? data : new Blob([data])) };

  const sample = {
    async limits() { return { images: !!(window.NovaCerveau && NovaCerveau.voitImages()) }; },
    async json(prompt, opts) {
      if (!window.NovaCerveau) throw Object.assign(new Error("cerveau pas prêt"), { code: "unavailable" });
      return NovaCerveau.json(prompt, opts || {});
    },
    async text(prompt, opts) {
      if (!window.NovaCerveau) throw Object.assign(new Error("cerveau pas prêt"), { code: "unavailable" });
      return NovaCerveau.texte(prompt, opts || {});
    },
  };

  const artifact = {
    async publish(html) {
      const m = /<script id="state" type="application\/json">([\s\S]*?)<\/script>/.exec(String(html || ""));
      if (!m) throw Object.assign(new Error("planning illisible"), { code: "invalid" });
      const etat = JSON.parse(m[1]);
      await S.kvMettre("planning", etat);
      if (window.NovaJournal) NovaJournal.ajouter("planning", "Planning enregistré dans le téléphone");
      return { ok: true };
    },
  };

  const mcp = {
    async callTool(serveur, outil, args) {
      if (outil !== "fire_trigger") throw Object.assign(new Error("outil indisponible dans l'appli : " + outil), { code: "unavailable" });
      if (!window.NovaAgent) throw Object.assign(new Error("agent pas prêt"), { code: "unavailable" });
      NovaAgent.reveil(String((args && args.text) || "")); // l'agent répond dans la mémoire, comme la tâche Claude
      return { ok: true, content: [{ type: "text", text: "réveil reçu" }] };
    },
  };

  const espaces = { db, user, assets, downloads, sample, artifact, mcp };
  window.claude = Object.freeze({
    use: async (nom) => { await S.ouvrir(); return espaces[nom] || null; },
  });

  /* Les fichiers « _blob/<id> » : servis par le service worker ; ce relais marche aussi avant qu'il soit actif. */
  const fetchOrigine = window.fetch.bind(window);
  window.fetch = async function (entree, init) {
    const url = typeof entree === "string" ? entree : entree && entree.url;
    const m = url && /(?:^|\/)_blob\/([0-9a-f]{16,64})(?:[?#].*)?$/.exec(url);
    if (m) {
      const b = await S.blobLire(m[1]);
      if (!b) return new Response("fichier introuvable", { status: 404 });
      return new Response(b.blob, { status: 200, headers: { "Content-Type": b.type || "application/octet-stream" } });
    }
    return fetchOrigine(entree, init);
  };
})();
