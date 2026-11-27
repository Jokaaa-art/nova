/* N.O.V.A — le cerveau. Gratuit en ligne (Gemini, Groq, OpenRouter : clés de Joka, gardées dans le téléphone),
   jamais sans son autorisation. Sans Internet ou sans clé : l'appli marche, l'agent passe en « réflexes » (agent.js).
   Rien n'est simulé : si aucun cerveau ne répond, on le dit. */
(function () {
  "use strict";
  const S = window.NovaStore;
  const FOURNISSEURS = {
    gemini: { nom: "Gemini (Google)", cle: "https://aistudio.google.com/apikey", images: true, recherche: true },
    groq: { nom: "Groq", cle: "https://console.groq.com/keys", images: false, recherche: false },
    openrouter: { nom: "OpenRouter (modèles gratuits)", cle: "https://openrouter.ai/settings/keys", images: true, recherche: false },
  };
  const ORDRE = ["gemini", "groq", "openrouter"];
  const DEFAUT = { autorise: false, ordre: ORDRE.slice(), cles: {}, modeles: {}, temperature: 0.6 };
  let cfg = null;

  async function config() {
    if (!cfg) cfg = Object.assign({}, DEFAUT, (await S.kvLire("cerveau")) || {});
    cfg.cles = cfg.cles || {}; cfg.modeles = cfg.modeles || {};
    return cfg;
  }
  async function regler(modif) {
    await config(); cfg = Object.assign({}, cfg, modif);
    await S.kvMettre("cerveau", cfg);
    window.dispatchEvent(new CustomEvent("nova:cerveau"));
    return cfg;
  }
  const actifs = (c) => c.ordre.filter((f) => c.cles[f]);
  const enLigne = () => navigator.onLine !== false;

  /* ---------- statistiques (servent au Labo) ---------- */
  async function noter(f, ok, ms, erreur) {
    const st = (await S.kvLire("stats_cerveau")) || {};
    const x = st[f] || { appels: 0, echecs: 0, ms: 0, derniereErreur: "" };
    x.appels++; if (!ok) { x.echecs++; x.derniereErreur = String(erreur || "").slice(0, 160); x.erreurAt = Date.now(); }
    else x.ms = x.ms ? Math.round(x.ms * 0.8 + ms * 0.2) : Math.round(ms);
    x.recents = (x.recents || []).concat([{ ok: !!ok, ms: Math.round(ms || 0), at: Date.now() }]).slice(-30);
    x.at = Date.now(); st[f] = x; await S.kvMettre("stats_cerveau", st);
  }

  /* ---------- outils ---------- */
  function signalAvecDelai(signal, ms) {
    const c = new AbortController(); const t = setTimeout(() => c.abort(new Error("délai dépassé")), ms);
    if (signal) { if (signal.aborted) c.abort(signal.reason); else signal.addEventListener("abort", () => c.abort(signal.reason), { once: true }); }
    return { signal: c.signal, fin: () => clearTimeout(t) };
  }
  async function b64(blob) {
    const buf = new Uint8Array(await blob.arrayBuffer()); let s = "";
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function lireJSON(t) {
    if (t && typeof t === "object") return t;
    const s = String(t || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    try { return JSON.parse(s); } catch (e) {}
    const i = s.search(/[\[{]/);
    if (i < 0) throw Object.assign(new Error("réponse sans JSON"), { code: "invalid" });
    const ouv = s[i], ferm = ouv === "{" ? "}" : "]"; let d = 0, q = false, esc = false;
    for (let j = i; j < s.length; j++) {
      const c = s[j];
      if (q) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') q = false; continue; }
      if (c === '"') q = true; else if (c === ouv) d++; else if (c === ferm && !--d) return JSON.parse(s.slice(i, j + 1));
    }
    throw Object.assign(new Error("JSON incomplet"), { code: "invalid" });
  }
  async function erreurHTTP(r) {
    let msg = r.status + " " + r.statusText;
    try { const j = await r.json(); msg = (j.error && (j.error.message || j.error)) || msg; } catch (e) {}
    const e = new Error(String(msg).slice(0, 200)); e.status = r.status;
    e.code = r.status === 429 ? "quota" : r.status === 401 || r.status === 403 ? "cle" : "service"; return e;
  }

  /* ---------- choix automatique d'un modèle gratuit ---------- */
  async function modeles(f, cle) {
    if (f === "gemini") {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": cle } });
      if (!r.ok) throw await erreurHTTP(r);
      return ((await r.json()).models || []).filter((m) => (m.supportedGenerationMethods || []).includes("generateContent")).map((m) => m.name.replace(/^models\//, ""));
    }
    const base = f === "groq" ? "https://api.groq.com/openai/v1" : "https://openrouter.ai/api/v1";
    const r = await fetch(base + "/models", { headers: { Authorization: "Bearer " + cle } });
    if (!r.ok) throw await erreurHTTP(r);
    return ((await r.json()).data || []).map((m) => m.id);
  }
  function choisir(f, liste) {
    const version = (n) => { const m = /(\d+(?:\.\d+)?)/.exec(n); return m ? parseFloat(m[1]) : 0; };
    if (f === "gemini") {
      const ok = liste.filter((n) => /^gemini-\d/.test(n) && /flash/.test(n) && !/(image|tts|audio|live|embedding|exp|thinking)/.test(n));
      const stables = ok.filter((n) => !/preview/.test(n));
      const pool = (stables.length ? stables : ok).sort((a, b) => version(b) - version(a) || (/lite/.test(a) ? 1 : 0) - (/lite/.test(b) ? 1 : 0));
      return pool[0] || "gemini-2.5-flash";
    }
    if (f === "groq") {
      const pref = ["openai/gpt-oss-120b", "llama-3.3-70b-versatile", "openai/gpt-oss-20b", "llama-3.1-8b-instant"];
      return pref.find((p) => liste.includes(p)) || liste.find((n) => !/(whisper|guard|tts|orpheus|playai)/.test(n)) || "llama-3.3-70b-versatile";
    }
    const gratuits = liste.filter((n) => /:free$/.test(n));
    const pref = [/llama-3\.3-70b/, /gpt-oss-120b/, /deepseek-chat/, /qwen.*(72|235|32)b/, /gemma-3-27b/, /mistral-small/];
    for (const re of pref) { const m = gratuits.find((n) => re.test(n)); if (m) return m; }
    return gratuits[0] || "meta-llama/llama-3.3-70b-instruct:free";
  }
  async function modeleDe(f) {
    const c = await config();
    if (c.modeles[f]) return c.modeles[f];
    let m;
    try { m = choisir(f, await modeles(f, c.cles[f])); } catch (e) { m = choisir(f, []); }
    c.modeles[f] = m; await regler({ modeles: c.modeles }); return m;
  }

  /* ---------- appels ---------- */
  async function appelGemini(cle, modele, o, signal) {
    const parts = [{ text: o.prompt }];
    for (const im of o.images || []) parts.push({ inline_data: { mime_type: im.type || "image/jpeg", data: await b64(im) } });
    const contents = (o.historique || []).map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.text }] }));
    contents.push({ role: "user", parts });
    const corps = { contents, generationConfig: { temperature: o.temperature, maxOutputTokens: o.max || 2048 } };
    if (o.systeme) corps.systemInstruction = { parts: [{ text: o.systeme }] };
    if (o.json && !o.web) corps.generationConfig.responseMimeType = "application/json";
    if (o.web) corps.tools = [{ google_search: {} }];
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modele)}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": cle }, body: JSON.stringify(corps), signal,
    });
    if (!r.ok) throw await erreurHTTP(r);
    const j = await r.json(); const cand = (j.candidates || [])[0];
    if (!cand) throw Object.assign(new Error((j.promptFeedback && j.promptFeedback.blockReason) || "réponse vide"), { code: "service" });
    const texte = ((cand.content && cand.content.parts) || []).map((p) => p.text || "").join("").trim();
    const sources = (((cand.groundingMetadata || {}).groundingChunks) || []).map((g) => g.web).filter(Boolean).map((w) => ({ titre: w.title || w.uri, url: w.uri }));
    return { texte, sources };
  }
  async function appelOpenAI(f, cle, modele, o, signal) {
    const base = f === "groq" ? "https://api.groq.com/openai/v1" : "https://openrouter.ai/api/v1";
    const messages = [];
    if (o.systeme) messages.push({ role: "system", content: o.systeme });
    (o.historique || []).forEach((m) => messages.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));
    if ((o.images || []).length) {
      const c = [{ type: "text", text: o.prompt }];
      for (const im of o.images) c.push({ type: "image_url", image_url: { url: `data:${im.type || "image/jpeg"};base64,${await b64(im)}` } });
      messages.push({ role: "user", content: c });
    } else messages.push({ role: "user", content: o.prompt });
    const corps = { model: modele, messages, temperature: o.temperature, max_tokens: o.max || 2048 };
    if (o.json) corps.response_format = { type: "json_object" };
    const h = { "Content-Type": "application/json", Authorization: "Bearer " + cle };
    if (f === "openrouter") { h["HTTP-Referer"] = location.origin; h["X-Title"] = "N.O.V.A"; }
    let r = await fetch(base + "/chat/completions", { method: "POST", headers: h, body: JSON.stringify(corps), signal });
    if (!r.ok && r.status === 400 && corps.response_format) { delete corps.response_format; r = await fetch(base + "/chat/completions", { method: "POST", headers: h, body: JSON.stringify(corps), signal }); }
    if (!r.ok) throw await erreurHTTP(r);
    const j = await r.json(); const m = j.choices && j.choices[0] && j.choices[0].message;
    return { texte: String((m && m.content) || "").trim(), sources: [] };
  }

  async function demander(o) {
    const c = await config();
    if (!c.autorise) throw Object.assign(new Error("cerveau en ligne pas encore autorisé (Outils → Cerveau)"), { code: "autorisation" });
    if (!enLigne()) throw Object.assign(new Error("pas d'Internet"), { code: "horsligne" });
    let liste = actifs(c);
    if (o.images && o.images.length) liste = liste.filter((f) => FOURNISSEURS[f].images);
    if (o.web) liste = liste.filter((f) => FOURNISSEURS[f].recherche);
    if (!liste.length) throw Object.assign(new Error(o.web ? "aucune clé qui sait chercher sur le web (il faut Gemini)" : o.images ? "aucune clé qui sait lire les images (Gemini ou OpenRouter)" : "aucune clé de cerveau enregistrée (Outils → Cerveau)"), { code: "cle" });
    const opts = Object.assign({ temperature: c.temperature }, o);
    let derniere;
    for (const f of liste) {
      const { signal, fin } = signalAvecDelai(o.signal, o.delai || 90000);
      const t0 = performance.now();
      try {
        const modele = await modeleDe(f);
        const r = f === "gemini" ? await appelGemini(c.cles[f], modele, opts, signal) : await appelOpenAI(f, c.cles[f], modele, opts, signal);
        fin(); await noter(f, true, performance.now() - t0);
        if (!r.texte) throw Object.assign(new Error("réponse vide"), { code: "service" });
        return Object.assign(r, { fournisseur: f, modele });
      } catch (e) {
        fin(); derniere = e;
        if (o.signal && o.signal.aborted) throw Object.assign(new Error("annulé"), { code: "cancelled" });
        await noter(f, false, 0, e.message);
        if (e.status === 404) { c.modeles[f] = ""; await regler({ modeles: c.modeles }); }
      }
    }
    throw Object.assign(new Error("aucun cerveau n'a répondu : " + (derniere ? derniere.message : "?")), { code: (derniere && derniere.code) || "service" });
  }

  /* ---------- Wikipédia : recherche gratuite sans clé (savoir général, pas l'actualité) ---------- */
  async function wikipedia(question, signal) {
    const u = "https://fr.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=3&srsearch=" + encodeURIComponent(question);
    const r = await fetch(u, { signal }); if (!r.ok) throw await erreurHTTP(r);
    const res = ((await r.json()).query || {}).search || [];
    return res.map((x) => ({ titre: x.title, url: "https://fr.wikipedia.org/wiki/" + encodeURIComponent(x.title.replace(/ /g, "_")), extrait: String(x.snippet || "").replace(/<[^>]+>/g, "") }));
  }

  window.NovaCerveau = {
    FOURNISSEURS,
    config, regler,
    async pret() { const c = await config(); return !!(c.autorise && actifs(c).length && enLigne()); },
    async etatTexte() {
      const c = await config(), a = actifs(c);
      if (!enLigne()) return { code: "horsligne", texte: "Hors connexion : réflexes locaux seulement" };
      if (!a.length) return { code: "cle", texte: "Aucune clé : ajoute une clé gratuite" };
      if (!c.autorise) return { code: "autorisation", texte: "En attente de ton autorisation" };
      return { code: "ok", texte: a.map((f) => FOURNISSEURS[f].nom.split(" ")[0]).join(" puis ") };
    },
    voitImages() { return !!(cfg && cfg.autorise && actifs(cfg).some((f) => FOURNISSEURS[f].images)); },
    async texte(prompt, o) { return (await demander(Object.assign({}, o || {}, { prompt: String(prompt), images: imagesDe(o) }))).texte; },
    async json(prompt, o) {
      const r = await demander(Object.assign({}, o || {}, { prompt: String(prompt) + "\n\nRéponds uniquement avec un objet JSON valide.", json: true, images: imagesDe(o) }));
      return lireJSON(r.texte);
    },
    demander, lireJSON,
    async recherche(question, o) {
      try { return await demander(Object.assign({}, o || {}, { prompt: question, web: true })); }
      catch (e) {
        if (e.code === "cancelled") throw e;
        const w = await wikipedia(question, o && o.signal);
        return { texte: "", sources: w, fournisseur: "wikipedia", note: "Recherche web en ligne indisponible (" + e.message + ") : seulement Wikipédia." };
      }
    },
    wikipedia,
    async tester(f) {
      const c = await config(); if (!c.cles[f]) return { ok: false, erreur: "pas de clé" };
      const t0 = performance.now();
      try {
        const liste = await modeles(f, c.cles[f]);
        const m = choisir(f, liste); c.modeles[f] = m; await regler({ modeles: c.modeles });
        const { signal, fin } = signalAvecDelai(null, 30000);
        const r = f === "gemini" ? await appelGemini(c.cles[f], m, { prompt: "Réponds juste : OK", temperature: 0 }, signal) : await appelOpenAI(f, c.cles[f], m, { prompt: "Réponds juste : OK", temperature: 0 }, signal);
        fin(); const ms = Math.round(performance.now() - t0); await noter(f, true, ms);
        return { ok: /ok/i.test(r.texte), modele: m, ms, texte: r.texte.slice(0, 40) };
      } catch (e) { await noter(f, false, 0, e.message); return { ok: false, erreur: e.message }; }
    },
    async stats() { return (await S.kvLire("stats_cerveau")) || {}; },
  };
  function imagesDe(o) { const im = o && o.images; if (!im || im === true) return []; return Array.isArray(im) ? im : [im]; }
})();
