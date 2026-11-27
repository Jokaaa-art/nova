/* N.O.V.A — sauvegarde : importer le fichier « NOVA-donnees-….json » (venu de l'ancienne N.O.V.A ou de l'appli),
   exporter tout dans le même format. Rien ne quitte le téléphone sans que Joka choisisse où va le fichier. */
(function () {
  "use strict";
  const S = window.NovaStore;
  const B = "data/users/me/";

  function base64EnBlob(b64, type) {
    const bin = atob(b64); const n = bin.length; const u = new Uint8Array(n);
    for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
    return new Blob([u], { type: type || "application/octet-stream" });
  }
  async function blobEnBase64(blob) {
    const u = new Uint8Array(await blob.arrayBuffer()); let s = "";
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  }
  const NOMS = {
    "nova/chat": "messages du chat", "nova/docs": "documents", "nova/journal": "pages de journal", "nova/savoirs": "savoirs", "nova/aranger": "éléments à ranger",
    "nova/rdv": "rendez-vous", "nova/repas": "repas", "nova/recettes": "jours de recettes", "nova/mesrecettes": "recettes perso", "nova/ingredients": "ingrédients",
    "nova/pesees": "pesées", "nova/pas": "jours de pas", "nova/seances": "séances", "nova/cryptochat": "messages crypto", "nova/cryptosim": "décisions crypto (simulation)",
    "budget/mois": "mois de budget", "budget/jmois": "mois du compte joint", "budget/demandes": "demandes d'achat", "budget/achats": "achats", "nova/operations": "opérations",
  };

  /* lit et vérifie le fichier ; ne touche à rien */
  async function lire(fichier) {
    if (!fichier) throw new Error("aucun fichier choisi");
    if (fichier.size > 200 * 1024 * 1024) throw new Error("fichier trop gros (" + Math.round(fichier.size / 1048576) + " Mo)");
    let j;
    try { j = JSON.parse(await fichier.text()); } catch (e) { throw new Error("ce fichier n'est pas un export N.O.V.A lisible (JSON abîmé)"); }
    if (j && j.format === "nova-profil") {
      const r = (Array.isArray(j.remplacements) ? j.remplacements : []).filter((p) => Array.isArray(p) && p.length === 2 && typeof p[0] === "string" && typeof p[1] === "string" && p[0].length >= 3 && p[0].length < 60 && p[1].length < 120);
      if (!r.length) throw new Error("profil vide");
      return { profil: { format: "nova-profil", version: 1, remplacements: r } };
    }
    if (!j || j.format !== "nova-export") throw new Error("ce fichier n'est pas un export N.O.V.A");
    const docs = Object.entries(j.documents || {}).filter(([, v]) => v && typeof v === "object");
    const cols = Object.entries(j.collections || {}).map(([c, l]) => [c, Array.isArray(l) ? l.filter((x) => x && x.id && x.data) : []]);
    const fichiers = Object.entries(j.fichiers || {}).filter(([id, f]) => /^[0-9a-f]{16,64}$/.test(id) && f && f.base64);
    const lignes = [];
    if (docs.length) lignes.push(docs.length + " fiches (" + docs.map(([d]) => d).join(", ") + ")");
    cols.filter(([, l]) => l.length).forEach(([c, l]) => lignes.push(l.length + " " + (NOMS[c] || c)));
    if (fichiers.length) lignes.push(fichiers.length + " fichiers (" + Math.round(fichiers.reduce((s, [, f]) => s + (f.taille || 0), 0) / 1024) + " ko)");
    if (j.planning && Array.isArray(j.planning.blocks)) lignes.push(j.planning.blocks.length + " créneaux de planning");
    const total = docs.length + cols.reduce((s, [, l]) => s + l.length, 0);
    return { brut: j, docs, cols, fichiers, lignes, total, erreursSource: Array.isArray(j.erreurs) ? j.erreurs : [], annonce: j.total || null, cree: j.cree || null, source: j.source || "" };
  }

  /* écrit dans le téléphone. mode « fusion » : garde la version la plus récente de chaque élément */
  async function importer(lu, opts) {
    opts = opts || {}; const prog = opts.progres || (() => {});
    await S.ouvrir();
    if (opts.mode === "remplacer") await S.toutEffacer();
    let ecrits = 0, gardes = 0, fusionnes = 0, n = 0; const erreurs = [];
    const total = lu.total + lu.fichiers.length;
    const ecrire = async (chemin, data, fiche) => {
      const loc = S.tous(chemin).find((d) => d.path === chemin);
      if (loc && opts.mode !== "remplacer" && (loc.data.ts || 0) > (data.ts || 0)) {
        /* une fiche (nova, memoire…) : on fusionne, la version locale plus récente gagne champ par champ */
        if (fiche) { await S.ecrireBrut(chemin, Object.assign({}, data, loc.data)); ecrits++; fusionnes++; return; }
        gardes++; return;
      }
      await S.ecrireBrut(chemin, data); ecrits++;
    };
    for (const [d, data] of lu.docs) {
      try { await ecrire(B + d, data, true); } catch (e) { erreurs.push(d + " : " + e.message); }
      if (++n % 20 === 0) prog(n / total);
    }
    for (const [c, l] of lu.cols) {
      if (!/^[\w\-]+(\/[\w\-]+\/[\w\-]+)*\/?[\w\-]*$/.test(c)) { erreurs.push("collection ignorée : " + c); continue; }
      for (const x of l) {
        try { if (!/^[\w\-.]+$/.test(x.id)) throw new Error("identifiant invalide"); await ecrire(B + c + "/" + x.id, x.data); }
        catch (e) { erreurs.push(c + "/" + x.id + " : " + e.message); }
        if (++n % 20 === 0) { prog(n / total); await new Promise((r) => setTimeout(r, 0)); }
      }
    }
    let fichiersOk = 0;
    for (const [id, f] of lu.fichiers) {
      try { await S.blobMettre(base64EnBlob(f.base64, f.type), { id, type: f.type }); fichiersOk++; }
      catch (e) { erreurs.push("fichier " + id.slice(0, 6) + "… : " + e.message); }
      prog(++n / total);
    }
    if (lu.brut.planning && Array.isArray(lu.brut.planning.blocks)) {
      const loc = await S.kvLire("planning");
      if (!loc || opts.mode === "remplacer" || !(loc.blocks || []).length || opts.planning === "importer") await S.kvMettre("planning", { prio: lu.brut.planning.prio || { pro: 2, zan: 1, nova: 1 }, blocks: lu.brut.planning.blocks });
    }
    if (lu.brut.profil && Array.isArray(lu.brut.profil.remplacements)) await S.kvMettre("profil", lu.brut.profil);
    await S.kvMettre("import_dernier", { at: Date.now(), ecrits, gardes, fichiers: fichiersOk, erreurs: erreurs.length, source: lu.source });
    await S.demanderPersistance();
    if (window.NovaJournal) await NovaJournal.ajouter("sauvegarde", `Import : ${ecrits} éléments, ${fichiersOk} fichiers` + (gardes ? `, ${gardes} plus récents gardés` : "") + (erreurs.length ? `, ${erreurs.length} souci(s)` : ""));
    prog(1);
    return { ecrits, gardes, fusionnes, fichiers: fichiersOk, erreurs };
  }

  /* tout le contenu du téléphone dans un fichier, même format que l'ancienne N.O.V.A */
  async function exporter() {
    await S.ouvrir();
    const out = { format: "nova-export", version: 2, cree: Date.now(), source: "appli N.O.V.A (iPhone)", planning: (await S.kvLire("planning")) || null, profil: (await S.kvLire("profil")) || null, documents: {}, collections: {}, fichiers: {}, erreurs: [] };
    for (const d of S.tous(B)) {
      const rel = d.path.slice(B.length), seg = rel.split("/");
      if (seg.length === 1) out.documents[rel] = d.data;
      else { const c = seg.slice(0, -1).join("/"); (out.collections[c] = out.collections[c] || []).push({ id: seg[seg.length - 1], data: d.data }); }
    }
    for (const b of await S.blobsListe()) {
      try { const x = await S.blobLire(b.id); out.fichiers[b.id] = { type: x.type, taille: x.blob.size, base64: await blobEnBase64(x.blob) }; }
      catch (e) { out.erreurs.push("fichier " + b.id.slice(0, 6) + "… : " + e.message); }
    }
    out.total = { documents: Object.keys(out.documents).length + Object.values(out.collections).reduce((s, l) => s + l.length, 0), fichiers: Object.keys(out.fichiers).length };
    const nom = "NOVA-sauvegarde-" + (window.NovaAgent ? NovaAgent.dateParis() : new Date().toISOString().slice(0, 10)) + ".json";
    const blob = new Blob([JSON.stringify(out)], { type: "application/json" });
    const dl = await window.claude.use("downloads");
    await dl.save({ filename: nom, data: blob });
    await S.kvMettre("export_dernier", { at: Date.now(), total: out.total });
    if (window.NovaJournal) await NovaJournal.ajouter("sauvegarde", `Sauvegarde : ${out.total.documents} éléments, ${out.total.fichiers} fichiers`);
    return { nom, total: out.total, taille: blob.size, erreurs: out.erreurs };
  }

  async function importerProfil(p) {
    await S.kvMettre("profil", p);
    if (window.NovaJournal) await NovaJournal.ajouter("sauvegarde", "Profil personnel importé (" + p.remplacements.length + " noms)");
  }
  window.NovaSauvegarde = { lire, importer, exporter, importerProfil, NOMS };
})();
