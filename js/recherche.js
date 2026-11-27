/* N.O.V.A — recherche locale : un petit moteur de recherche qui tourne dans le téléphone, sans Internet ni serveur.
   Il classe les souvenirs (mémoire, savoirs, journal, chat, documents, projets) par pertinence (BM25),
   ignore les accents, les pluriels et les mots vides. Ce n'est pas un modèle d'IA : c'est un index de mots. */
(function () {
  "use strict";
  const S = window.NovaStore;
  const B = "data/users/me/";
  const VIDES = new Set(("a au aux avec ce ces cet cette c ca ça dans de des du elle en et eux il ils je j la le les leur leurs l lui ma mais me meme mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous y d n s t m est sont etait ete fait faire avoir etre plus moins tres bien tout tous toute toutes quoi comment quand quel quelle quels quelles dont donc car si ni deja encore aussi alors ici la-bas ok oui non").split(" "));
  const PROCHES = { sport: ["seance", "entrainement", "muscu"], seance: ["sport"], argent: ["budget", "depense", "achat"], budget: ["depense", "argent"], depense: ["budget", "achat"], poids: ["pesee", "kilo"], pesee: ["poids"], manger: ["repas", "nutrition"], repas: ["manger", "nutrition"], dormir: ["sommeil", "coucher"], sommeil: ["dormir"], travail: ["boulot", "entreprise"], boulot: ["travail"], famille: ["enfant", "couple"], live: ["stream"], stream: ["live"], course: ["courir", "footing", "running"], courir: ["course", "footing"], footing: ["courir", "course"], objectif: ["but", "veut"], fatigue: ["fatigue", "epuise", "creve"], humeur: ["moral", "ressenti"], moral: ["humeur"], rendez: ["rdv"], rdv: ["rendez"] };

  function sansAccents(t) { return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function racine(m) {
    if (m.length > 3 && /[sx]$/.test(m)) m = m.slice(0, -1);
    for (const f of ["ements", "ement", "ations", "ation", "euses", "euse", "eux", "ites", "ite", "ables", "able", "ees", "ee", "er", "es", "e"]) {
      if (m.endsWith(f) && m.length - f.length >= 4) return m.slice(0, -f.length);
    }
    return m;
  }
  let PR = null; /* mots proches, rangés par racine */
  function proche() { if (!PR) { PR = {}; Object.keys(PROCHES).forEach((k) => { PR[racine(k)] = PROCHES[k]; }); } return PR; }
  function mots(t) {
    return sansAccents(t).replace(/[^a-z0-9]+/g, " ").split(" ").filter((m) => m.length >= 2 && !VIDES.has(m)).map(racine);
  }
  const date = (ts) => (ts ? new Date(ts).toLocaleDateString("fr-FR") : "");
  const txt = (v) => (v == null ? "" : typeof v === "string" ? v : Array.isArray(v) ? v.map(txt).join(" ") : typeof v === "object" ? Object.values(v).map(txt).join(" ") : String(v));

  /* Les morceaux de mémoire qu'on indexe (chacun garde sa provenance et sa date) */
  function morceaux() {
    const l = [];
    const tous = S.tous(B);
    for (const d of tous) {
      const p = d.path.slice(B.length), x = d.data || {};
      if (p === "memoire") {
        String(x.body || "").split("\n").forEach((ligne, i) => {
          if (/^\s*#/.test(ligne)) return; /* un titre de section n'est pas un souvenir */
          const t = ligne.replace(/^[-*•\s]+/, "").trim(); if (t.length < 3) return;
          l.push({ type: "Ce qu'elle sait", titre: t.slice(0, 120), texte: t, chemin: "memoire", ligne: i, ts: x.ts, confiance: x.editedBy === "joka" ? "écrit par toi" : "noté par N.O.V.A" });
        });
      } else if (p.startsWith("nova/savoirs/")) l.push({ type: "Connaissance", titre: x.title || d.id, texte: (x.title || "") + " " + txt(x.body) + " " + txt(x.domaine), chemin: p, ts: x.ts, confiance: (x.sources || []).length ? "sourcé" : "noté par N.O.V.A" });
      else if (p.startsWith("nova/journal/")) l.push({ type: "Journal", titre: (x.date || "") + (x.humeur ? " — " + x.humeur : "") || d.id, texte: txt([x.texte, x.notes, x.resume, x.humeur]), chemin: p, ts: x.ts, confiance: "écrit par toi" });
      else if (p.startsWith("nova/chat/") && x.text && !x.reflexe) l.push({ type: x.role === "joka" ? "Toi, dans le chat" : "N.O.V.A, dans le chat", titre: String(x.text).slice(0, 110), texte: x.text, chemin: p, ts: x.ts, confiance: x.role === "joka" ? "dit par toi" : "dit par N.O.V.A" });
      else if (p.startsWith("nova/docs/")) l.push({ type: "Document", titre: x.title || x.titre || x.name || d.id, texte: txt([x.title, x.titre, x.name, x.summary, x.resume, x.type, x.notes, x.fields, x.champs]), chemin: p, ts: x.ts || x.addedAt, confiance: "document" });
      else if (p.startsWith("nova/projets/")) l.push({ type: "Projet", titre: x.titre || d.id, texte: txt([x.titre, x.etape, x.note, x.statut]), chemin: p, ts: x.maj || x.ts, confiance: "écrit par toi" });
    }
    return l;
  }

  let cache = null;
  function signature() { const t = S.tous(B); let s = t.length; for (const d of t) s = (s * 31 + (d.updatedAt || 0)) % 1e12; return s; }
  function index() {
    const sig = signature();
    if (cache && cache.sig === sig) return cache;
    const docs = morceaux().map((m) => { const ms = mots(m.titre + " " + m.texte); const tf = new Map(); ms.forEach((w) => tf.set(w, (tf.get(w) || 0) + 1)); return Object.assign(m, { tf, n: ms.length }); });
    const df = new Map(); docs.forEach((d) => d.tf.forEach((_, w) => df.set(w, (df.get(w) || 0) + 1)));
    const moy = docs.reduce((a, d) => a + d.n, 0) / (docs.length || 1);
    cache = { sig, docs, df, moy, vocab: [...df.keys()] };
    return cache;
  }

  function extrait(texte, termes) {
    const t = String(texte || "").replace(/\s+/g, " "); const bas = sansAccents(t);
    let i = -1; for (const m of termes) { const k = bas.indexOf(m.slice(0, Math.max(3, m.length - 1))); if (k >= 0 && (i < 0 || k < i)) i = k; }
    if (i < 0 || t.length <= 170) return t.slice(0, 170) + (t.length > 170 ? "…" : "");
    const a = Math.max(0, i - 50); return (a ? "…" : "") + t.slice(a, a + 170) + (a + 170 < t.length ? "…" : "");
  }

  /* chercher("ma dernière pesée") → les souvenirs les plus proches, du plus pertinent au moins pertinent */
  function chercher(question, opts) {
    opts = opts || {};
    const ix = index(); const N = ix.docs.length; if (!N) return [];
    const base = [...new Set(mots(question))]; if (!base.length) return [];
    const poids = new Map();
    const proches = [];
    base.forEach((w) => { poids.set(w, 1); (proche()[w] || []).forEach((p) => proches.push(racine(sansAccents(p)))); });
    /* début de mot : « entrain » trouve « entrainement » ; un mot proche trouve ses formes (« dormir » → « dormi ») */
    ix.vocab.forEach((v) => {
      if (poids.has(v)) return;
      if (base.some((w) => w.length >= 4 && v.startsWith(w))) poids.set(v, 0.6);
      else if (proches.some((r) => v === r || (r.length >= 4 && v.startsWith(r.slice(0, Math.max(4, r.length - 2)))))) poids.set(v, 0.5);
    });
    const k1 = 1.2, b = 0.75, res = [];
    for (const d of ix.docs) {
      if (opts.types && !opts.types.includes(d.type)) continue;
      if (opts.sauf && opts.sauf.includes(d.chemin)) continue;
      let s = 0, vus = 0;
      poids.forEach((p, w) => {
        const f = d.tf.get(w); if (!f) return;
        const idf = Math.log(1 + (N - ix.df.get(w) + 0.5) / (ix.df.get(w) + 0.5));
        s += p * idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.n / (ix.moy || 1))); if (p === 1) vus++;
      });
      if (s <= 0) continue;
      s *= 1 + 0.25 * (vus / base.length); /* bonus si tous les mots de la question y sont */
      res.push({ type: d.type, titre: d.titre, extrait: extrait(d.texte, base), chemin: d.chemin, ligne: d.ligne, date: date(d.ts), ts: d.ts || 0, confiance: d.confiance, score: Math.round(s * 100) / 100 });
    }
    return res.sort((a, b2) => b2.score - a.score || b2.ts - a.ts).slice(0, opts.limite || 8);
  }

  window.NovaRecherche = {
    chercher,
    taille() { const ix = index(); return { morceaux: ix.docs.length, mots: ix.vocab.length }; },
    _mots: mots,
  };
})();
