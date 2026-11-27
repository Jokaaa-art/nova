/* N.O.V.A V2 — la coque : 5 espaces (Accueil, Chat, Mémoire, Labo, Outils), le noyau, la navigation,
   le démarrage (données du téléphone → planning → code v1 → agent → évolution), les panneaux système. */
(function () {
  "use strict";
  const S = window.NovaStore;
  const B = "data/users/me/";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const PLANNING_VIDE = { prio: { pro: 2, zan: 1, nova: 1 }, blocks: [] };

  /* ---------- icônes (traits, 24 px) ---------- */
  const I = {
    accueil: '<path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z"/><circle cx="12" cy="12" r="3"/>',
    chat: '<path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7l-4 3v-3H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/>',
    memoire: '<circle cx="12" cy="12" r="2.2"/><circle cx="5" cy="6" r="1.6"/><circle cx="19" cy="6" r="1.6"/><circle cx="5" cy="18" r="1.6"/><circle cx="19" cy="18" r="1.6"/><path d="M6.3 7l4 3.6M17.7 7l-4 3.6M6.3 17l4-3.6M17.7 17l-4-3.6"/>',
    labo: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path d="M7.5 15h9"/>',
    outils: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
    planning: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    budget: '<path d="M4 7h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"/><path d="M4 7l11-3v3M16 13h2"/>',
    crypto: '<circle cx="12" cy="12" r="8"/><path d="M10 8h3a2 2 0 0 1 0 4h-3m0 0h3.5a2 2 0 0 1 0 4H10V8m1-2v2m0 8v2"/>',
    nutrition: '<path d="M12 20c-4-1-7-4.5-7-9a7 7 0 0 1 7-7c0 5 3 8 7 8 0 4.5-3 7-7 8Z"/><path d="M12 20V11"/>',
    pesee: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8.5 10a4 4 0 0 1 7 0l-3 2.5"/>',
    sport: '<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>',
    ranger: '<path d="M4 13l2.5-7h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5Z"/><path d="M4 13h5l1 2h4l1-2h5"/>',
    docs: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    cerveau: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
    web: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5Z"/>',
    voix: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    notif: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    sauvegarde: '<path d="M12 4v11m0 0-4-4m4 4 4-4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    securite: '<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
    fichiers: '<path d="M3.5 6.5a1 1 0 0 1 1-1H9l2 2.5h8.5a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V6.5Z"/>',
    auto: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    reglages: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    retour: '<path d="m14.5 5-7 7 7 7"/>',
    reseau: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M9 16a4.5 4.5 0 0 1 6 0"/><circle cx="12" cy="19" r="1"/>',
    horsligne: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M9 16a4.5 4.5 0 0 1 6 0"/><path d="M3 3l18 18"/>',
    reveil: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3"/>',
    importer: '<path d="M12 15V4m0 0L8 8m4-4 4 4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    cycle: '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4.5h-4.5"/>',
  };
  const ic = (n, cls) => `<svg viewBox="0 0 24 24" aria-hidden="true"${cls ? ` class="${cls}"` : ""}>${I[n] || ""}</svg>`;

  /* ---------- modules : code v1 (onglets) et panneaux système ---------- */
  const MODULES = [
    { id: "planning", nom: "Planning", tab: "planning", groupe: "vie", ic: "planning" },
    { id: "budget", nom: "Budget", tab: "budget", groupe: "vie", ic: "budget" },
    { id: "nutrition", nom: "Nutrition", tab: "nutrition", groupe: "vie", ic: "nutrition" },
    { id: "sport", nom: "Sport", tab: "sport", groupe: "vie", ic: "sport" },
    { id: "pesee", nom: "Pesée", tab: "pesee", groupe: "vie", ic: "pesee" },
    { id: "crypto", nom: "Crypto", tab: "crypto", groupe: "vie", ic: "crypto" },
    { id: "ranger", nom: "À ranger", tab: "ranger", groupe: "vie", ic: "ranger" },
    { id: "docs", nom: "Documents", tab: "docs", groupe: "vie", ic: "docs" },
    { id: "cerveau", nom: "Cerveau", groupe: "sys", ic: "cerveau" },
    { id: "web", nom: "Recherche web", groupe: "sys", ic: "web" },
    { id: "voix", nom: "Voix et affichage", groupe: "sys", ic: "voix" },
    { id: "notifications", nom: "Notifications", groupe: "sys", ic: "notif" },
    { id: "automatisations", nom: "Automatisations", groupe: "sys", ic: "auto" },
    { id: "sauvegarde", nom: "Sauvegarde", groupe: "sys", ic: "sauvegarde" },
    { id: "fichiers", nom: "Fichiers", groupe: "sys", ic: "fichiers" },
    { id: "securite", nom: "Sécurité", groupe: "sys", ic: "securite" },
    { id: "reglages", nom: "Limites du planning", tab: "reglages", groupe: "sys", ic: "reglages" },
  ];
  const MOD = Object.fromEntries(MODULES.map((m) => [m.id, m]));
  const ESPACES = [["accueil", "Accueil"], ["chat", "Chat"], ["memoire", "Mémoire"], ["labo", "Labo"], ["outils", "Outils"]];

  /* ---------- état de la coque ---------- */
  const E = { route: { espace: "accueil", sous: "" }, v1pret: false, etatCerveau: null, compteurs: {}, memSeg: "reseau", memCat: null, memRecherche: "", import: null, attenteN: 0 };
  let toastT = 0;
  function toast(t) {
    let d = $("toast-nova"); if (!d) { d = document.createElement("div"); d.id = "toast-nova"; d.className = "toast-nova"; d.setAttribute("role", "status"); document.body.appendChild(d); }
    d.textContent = t; d.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { d.hidden = true; }, 3800);
  }
  const V1 = () => window.NovaV1;

  /* ---------- navigation (adresse #espace/sous, retour natif) ---------- */
  function lireRoute() {
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, "")).split("/");
    const espace = ESPACES.some(([k]) => k === h[0]) ? h[0] : "accueil";
    return { espace, sous: h[1] || "" };
  }
  function aller(espace, sous, remplacer) {
    const h = "#" + espace + (sous ? "/" + sous : "");
    if (location.hash === h) { afficher(); return; }
    if (remplacer) history.replaceState(null, "", h); else history.pushState(null, "", h);
    afficher();
  }
  addEventListener("popstate", () => afficher());
  addEventListener("hashchange", () => afficher());

  function tabVoulu(r) {
    if (r.espace === "chat") return "nova";
    if (r.espace === "memoire") return r.sous === "sait" ? "memoire" : r.sous === "docs" ? "docs" : null;
    if (r.espace === "outils" && r.sous && MOD[r.sous] && MOD[r.sous].tab) return MOD[r.sous].tab;
    return null;
  }
  let derniereVue = "";
  function afficher() {
    const r = (E.route = lireRoute());
    const tab = tabVoulu(r);
    const vue = r.espace === "outils" && r.sous ? "module" : r.espace;
    document.querySelectorAll(".espace").forEach((s) => (s.hidden = s.id !== "esp-" + vue));
    document.querySelectorAll(".onglet").forEach((b) => b.setAttribute("aria-current", b.dataset.espace === r.espace ? "page" : "false"));
    const barre = $("barre"); const mod = r.espace === "outils" && r.sous ? MOD[r.sous] : null;
    if (mod) barre.setAttribute("data-module", mod.id); else barre.removeAttribute("data-module");
    $("barre-titre").textContent = mod ? mod.nom : "";
    /* le code v1 se déplace là où on en a besoin */
    const hote = $("v1hote");
    if (tab) {
      const cible = r.espace === "chat" ? $("esp-chat") : r.espace === "memoire" ? $("mem-v1") : $("esp-module");
      if (cible && hote.parentNode !== cible) cible.appendChild(hote);
      hote.hidden = false; hote.dataset.tab = tab;
      if (V1() && V1().S.tab !== tab) V1().setTab(tab);
      if (tab === "nova") requestAnimationFrame(() => { const m = document.getElementById("msgs"); if (m) m.scrollTop = m.scrollHeight; });
    } else { hote.hidden = true; $("v1parking").appendChild(hote); }
    const cle = vue + ":" + (r.sous || "");
    if (cle !== derniereVue) {
      derniereVue = cle; window.scrollTo(0, 0);
      if (window.NovaEvolution) NovaEvolution.usage(mod ? "module:" + mod.id : "espace:" + r.espace);
    }
    if (vue === "accueil") rendreAccueil();
    else if (vue === "memoire") rendreMemoire();
    else if (vue === "labo") rendreLabo();
    else if (vue === "outils") rendreOutils();
    else if (vue === "module") rendreModule(mod);
    if (r.espace === "chat") { const ta = document.getElementById("input"); if (ta && matchMedia("(hover: hover)").matches) ta.focus(); }
  }
  /* si le code v1 change d'onglet tout seul (ex. « Demander à N.O.V.A »), la coque suit */
  function suivreV1() {
    const v = V1(); if (!v) return;
    const t = v.S.tab, voulu = tabVoulu(E.route);
    if (!voulu || t === voulu) return;
    if (t === "nova") aller("chat");
    else if (t === "memoire") aller("memoire", "sait");
    else if (t === "docs") aller("memoire", "docs");
    else { const m = MODULES.find((x) => x.tab === t); if (m) aller("outils", m.id); }
  }

  /* ---------- barre du haut ---------- */
  function majBarre() {
    const a = window.NovaCoeur ? NovaCoeur.actuel() : { nom: "", phrase: "" };
    const v = V1(); let txt = a.etat === "veille" && v ? v.ligneEtat() : a.phrase;
    $("barre-etat").textContent = txt || a.nom;
    const hors = navigator.onLine === false; const r = $("reseau");
    r.dataset.hors = hors ? "1" : "0"; r.innerHTML = ic(hors ? "horsligne" : "reseau") + `<span>${hors ? "Hors ligne" : ""}</span>`;
    r.setAttribute("aria-label", hors ? "Hors connexion" : "Connecté");
  }

  /* ---------- ACCUEIL : centre de commande ---------- */
  const bonjour = () => { const h = NovaAgent.partsParis().h; return h < 5 ? "Bonne nuit" : h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir"; };
  const quand = (ts) => { if (!ts) return "jamais"; const d = Date.now() - ts; if (d < 60000) return "à l'instant"; if (d < 3600e3) return "il y a " + Math.round(d / 60000) + " min"; if (d < 864e5) return "il y a " + Math.round(d / 3600e3) + " h"; return "il y a " + Math.round(d / 864e5) + " j"; };
  const heureCourte = (ts) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(new Date(ts));
  const octets = (n) => n > 1048576 ? (n / 1048576).toFixed(1).replace(".", ",") + " Mo" : Math.max(1, Math.round(n / 1024)) + " ko";

  async function rendreAccueil() {
    const el = $("esp-accueil");
    if (!el.dataset.monte) {
      el.dataset.monte = "1";
      el.innerHTML = `
        <div class="salut"><span id="acc-date"></span><b id="acc-salut">Bonjour Joka</b></div>
        <div class="noyau-zone">
          <canvas id="noyau" role="button" tabindex="0" aria-label="Noyau de N.O.V.A : touche pour parler"></canvas>
          <p class="etat-nom" id="noyau-nom" aria-live="polite"></p>
          <p class="etat-phrase" id="noyau-phrase"></p>
        </div>
        <div class="hud" id="acc-hud" aria-label="État du système"></div>
        <div id="acc-bienvenue"></div>
        <div class="actions-rapides">
          <button class="action-rapide" data-act="chat">${ic("chat")}<span>Discuter<small>Écrire à N.O.V.A</small></span></button>
          <button class="action-rapide" data-act="reveil">${ic("reveil")}<span>Réveiller<small>Faire le point</small></span></button>
          <button class="action-rapide" data-act="planning">${ic("planning")}<span>Ma journée<small id="acc-jour">Planning</small></span></button>
          <button class="action-rapide" data-act="budget">${ic("budget")}<span>Budget<small>Où j'en suis</small></span></button>
        </div>
        <section class="carte" aria-labelledby="acc-sys-t"><h2 id="acc-sys-t">Système</h2><div id="acc-sys"><div class="squelette"></div></div></section>
        <section class="carte" aria-labelledby="acc-tt-t"><h2 id="acc-tt-t">À traiter</h2><div id="acc-traiter" class="liste"><div class="squelette"></div></div></section>
        <section class="carte" aria-labelledby="acc-op-t"><h2 id="acc-op-t">Dernières opérations</h2><div id="acc-ops" class="liste"><div class="squelette"></div></div></section>`;
      NovaCoeur.monter($("noyau"));
      const toucher = () => parler();
      $("noyau").addEventListener("click", toucher);
      $("noyau").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toucher(); } });
      el.addEventListener("click", (e) => {
        const b = e.target.closest("[data-act]"); if (!b) return;
        const a = b.dataset.act;
        if (a === "chat") aller("chat");
        else if (a === "reveil") { if (V1()) V1().reveiller("Joka a appuyé sur « Réveiller N.O.V.A » : fais le point avec lui (une ligne si rien de neuf), vérifie le rythme.", true); aller("chat"); }
        else if (a === "planning") aller("outils", "planning");
        else if (a === "budget") aller("outils", "budget");
        else if (a === "importer") aller("outils", "sauvegarde");
        else if (a === "cerveau") aller("outils", "cerveau");
        else if (a === "ntfy") aller("outils", "notifications");
        else if (a === "ranger") aller("outils", "ranger");
        else if (a === "labo") aller("labo");
        else if (a === "attente") { NovaAgent.rejouer(true).then((n) => toast(n ? n + " demande(s) reprise(s)." : "Pas de cerveau disponible pour l'instant.")); }
        else if (a === "installer") toast("Dans Safari : touche Partager, puis « Sur l'écran d'accueil ».");
      });
    }
    const a = NovaCoeur.actuel();
    $("noyau-nom").textContent = a.nom; $("noyau-phrase").textContent = a.phrase;
    $("acc-salut").textContent = bonjour() + " Joka";
    $("acc-date").textContent = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" }).format(new Date());
    await Promise.all([accSysteme(), accTraiter(), accOps(), accBienvenue()]);
  }
  async function accBienvenue() {
    const n = S.compter(B), c = await NovaCerveau.config(), nt = await NovaNtfy.config();
    const etapes = [];
    if (n < 5) etapes.push(["importer", "Importer tes données", "Le fichier NOVA-donnees de l'app Fichiers."]);
    if (!c.autorise || !Object.values(c.cles).some(Boolean)) etapes.push(["cerveau", "Activer mon cerveau", "Une clé gratuite, gardée dans ton téléphone."]);
    if (!nt.actif) etapes.push(["ntfy", "Activer les rappels", "Check-in et bilan, même appli fermée."]);
    if (!navigator.standalone && !matchMedia("(display-mode: standalone)").matches) etapes.push(["installer", "M'installer sur l'écran d'accueil", "Safari → Partager → Sur l'écran d'accueil."]);
    $("acc-bienvenue").innerHTML = etapes.length ? `<section class="carte"><h2>Pour finir de m'installer</h2><div class="liste">${etapes.map(([k, t, s]) => `<div class="el"><div class="t"><b>${esc(t)}</b><small>${esc(s)}</small></div><button class="btn${k === etapes[0][0] ? " principal" : ""}" data-act="${k}">${k === "installer" ? "Comment" : "Ouvrir"}</button></div>`).join("")}</div></section>` : "";
  }
  async function accSysteme() {
    const et = await NovaCerveau.etatTexte(); const sto = await S.stockage(); const exp = await S.kvLire("export_dernier");
    const n = S.compter(B); const nova = (await S.doc(B + "nova").get()).data() || {};
    const lignes = [
      ["Moteur IA", et.texte, et.code === "ok" ? "ok" : "att"],
      ["Mémoire locale", n + " éléments, " + octets(sto.utilise || 0), n ? "ok" : "att"],
      ["Connexion", navigator.onLine === false ? "Hors ligne" : "En ligne", navigator.onLine === false ? "att" : "ok"],
      ["Mode", et.code === "ok" ? "Local + cerveau en ligne" : "Local seulement", ""],
      ["Sauvegarde", exp ? quand(exp.at) : "jamais faite", exp && Date.now() - exp.at < 7 * 864e5 ? "ok" : "att"],
      ["Prochain rendez-vous", (nova.nextRitual && nova.nextRitual.label) || "—", ""],
    ];
    $("acc-hud").innerHTML = [["Cerveau", et.code === "ok" ? "Actif" : et.code === "horsligne" ? "Hors ligne" : "En attente", et.code === "ok" ? "ok" : "att"], ["Mémoire", String(n), n ? "ok" : "att"], ["Réseau", navigator.onLine === false ? "Coupé" : "En ligne", navigator.onLine === false ? "att" : "ok"]]
      .map(([k, v, s]) => `<div class="hud-cell"><span>${esc(k)}</span><b data-etat="${s}">${esc(v)}</b></div>`).join("");
    $("acc-sys").innerHTML = lignes.map(([k, v, s]) => `<div class="ligne-kv"><span class="k">${esc(k)}</span><span class="v"${s ? ` data-etat="${s}"` : ""}>${esc(v)}</span></div>`).join("");
  }
  async function accTraiter() {
    const v = V1(); const items = [];
    if (v) {
      v.attention().forEach(([, t]) => items.push(["planning", t, "Planning"]));
      const ar = v.aRanger(); if (ar.length) items.push(["ranger", ar.length + " élément(s) à valider dans « À ranger »", "Voir"]);
    }
    const fa = await NovaAgent.attente(); if (fa.length) items.push(["attente", fa.length + " demande(s) gardée(s) pour plus tard", "Reprendre"]);
    const ev = await NovaEvolution.etat(); if (ev.propositions.length) items.push(["labo", ev.propositions.length + " amélioration(s) à valider", "Voir"]);
    $("acc-traiter").innerHTML = items.length ? items.map(([a, t, b]) => `<div class="el"><div class="t"><b>${esc(t)}</b></div><button class="btn" data-act="${a}">${esc(b)}</button></div>`).join("") : `<p class="vide">Rien d'urgent. Tout est à jour.</p>`;
  }
  async function accOps() {
    const l = await NovaJournal.derniers(6);
    $("acc-ops").innerHTML = l.length ? l.map((o) => `<div class="el"><div class="t"><b>${esc(o.texte)}</b></div><time class="mono" datetime="${new Date(o.ts).toISOString()}">${heureCourte(o.ts)}</time></div>`).join("") : `<p class="vide">Aucune opération pour l'instant. Elles s'afficheront ici, avec leur heure.</p>`;
  }

  /* ---------- VOIX : écouter (Safari) et lire à voix haute ---------- */
  let reco = null;
  function parler() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { aller("chat"); toast("La dictée n'est pas disponible ici : utilise le micro du clavier."); return; }
    if (reco) { try { reco.stop(); } catch (e) {} return; }
    reco = new SR(); reco.lang = "fr-FR"; reco.interimResults = true; reco.maxAlternatives = 1;
    let final = "";
    reco.onstart = () => NovaCoeur.etat("ecoute");
    reco.onresult = (e) => { let t = ""; for (const r of e.results) { t += r[0].transcript; if (r.isFinal) final = t; } NovaCoeur.etat("ecoute", "« " + t.slice(-80) + " »"); NovaCoeur.niveau(0.6); };
    reco.onerror = (e) => { NovaCoeur.etat("erreur", e.error === "not-allowed" ? "Micro refusé : autorise-le dans Réglages → Safari." : "Je n'ai pas entendu (" + e.error + ")."); setTimeout(() => NovaCoeur.etat("veille"), 3500); };
    reco.onend = () => {
      reco = null; const t = final.trim();
      if (t && V1()) { aller("chat"); V1().envoyer(t); } else if (NovaCoeur.actuel().etat === "ecoute") NovaCoeur.etat("veille");
    };
    try { reco.start(); } catch (e) { reco = null; toast("Écoute impossible : " + e.message); }
  }
  async function lireAVoixHaute(texte) {
    const v = (await S.kvLire("voix")) || {}; if (!v.lecture || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(String(texte).replace(/— N\.O\.V\.A.*$/s, "").replace(/[*_#`>]/g, "").slice(0, 900));
    u.lang = "fr-FR"; u.rate = v.vitesse || 1.05;
    const voix = speechSynthesis.getVoices().find((x) => x.name === v.nom) || speechSynthesis.getVoices().find((x) => /^fr/.test(x.lang));
    if (voix) u.voice = voix;
    u.onstart = () => NovaCoeur.etat("reponse"); u.onend = () => NovaCoeur.etat("veille");
    u.onboundary = () => NovaCoeur.niveau(0.7);
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }

  /* ---------- MÉMOIRE : réseau, ce qu'elle sait, documents ---------- */
  const CATS = [
    { id: "profil", nom: "Profil", re: /profil|qui|identit|famille|perso/i },
    { id: "prefs", nom: "Préférences", re: /pr[ée]f|aime|go[uû]t|style|habitude/i },
    { id: "projets", nom: "Projets", re: /projet|objectif|but|mgx|stream|travail/i },
    { id: "savoirs", nom: "Connaissances" },
    { id: "journal", nom: "Expériences" },
    { id: "chat", nom: "Conversations" },
    { id: "decisions", nom: "Décisions", re: /d[ée]cid|d[ée]cision|r[èe]gle|choix|choisi/i },
  ];
  function elementsMemoire() {
    const tous = S.tous(B);
    const memo = (tous.find((d) => d.path === B + "memoire") || {}).data || {};
    const out = Object.fromEntries(CATS.map((c) => [c.id, []]));
    let cat = "profil";
    String(memo.body || "").split("\n").forEach((l, i) => {
      const t = l.trim(); if (!t) return;
      const h = /^#{1,4}\s*(.+)$/.exec(t);
      if (h) { const c = CATS.find((x) => x.re && x.re.test(h[1])); cat = c ? c.id : cat; return; }
      const txt = t.replace(/^[-*•]\s*/, ""); if (txt.length < 3) return;
      const c = /d[ée]cid|a choisi|r[èe]gle :/i.test(txt) ? "decisions" : cat;
      out[c].push({ titre: txt.slice(0, 140), texte: txt, source: "Ce qu'elle sait", date: memo.ts, confiance: memo.editedBy === "joka" ? "Écrit par toi" : "Noté par N.O.V.A", chemin: null, ligne: i });
    });
    tous.filter((d) => d.path.startsWith(B + "nova/savoirs/")).forEach((d) => out.savoirs.push({ titre: d.data.title || d.id, texte: d.data.body || "", source: "Savoirs" + (d.data.domaine ? " (" + d.data.domaine + ")" : ""), date: d.data.ts, confiance: (d.data.sources || []).length ? "Sourcé" : "Noté par N.O.V.A", chemin: d.path }));
    tous.filter((d) => d.path.startsWith(B + "nova/journal/")).forEach((d) => out.journal.push({ titre: (d.data.date || d.id) + (d.data.humeur ? " — " + d.data.humeur : ""), texte: [d.data.texte, d.data.notes, d.data.resume].filter(Boolean).join("\n") || JSON.stringify(d.data).slice(0, 400), source: "Journal", date: d.data.ts, confiance: "Dit par toi", chemin: d.path }));
    tous.filter((d) => d.path.startsWith(B + "nova/chat/")).sort((a, b) => (b.data.ts || 0) - (a.data.ts || 0)).slice(0, 40).forEach((d) => out.chat.push({ titre: (d.data.role === "joka" ? "Toi : " : "N.O.V.A : ") + String(d.data.text || "").slice(0, 90), texte: d.data.text || "", source: "Chat", date: d.data.ts, confiance: d.data.role === "joka" ? "Dit par toi" : "Réponse de N.O.V.A", chemin: d.path }));
    Object.values(out).forEach((l) => l.sort((a, b) => (b.date || 0) - (a.date || 0)));
    return out;
  }
  function svgReseau(el, sel) {
    const W = 360, cx = 180, cy = 180, R = 118;
    let s = `<svg viewBox="0 0 ${W} ${W}" role="group" aria-label="Réseau de la mémoire">`;
    const pos = CATS.map((c, i) => { const a = -Math.PI / 2 + (i / CATS.length) * Math.PI * 2; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R, a]; });
    CATS.forEach((c, i) => {
      const [x, y, a] = pos[i]; const n = el[c.id].length; const on = sel === c.id;
      s += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--ligne-forte)" stroke-width="${on ? 1.6 : 1}"/>`;
      el[c.id].slice(0, 6).forEach((_, k) => {
        const b = a + (k - 2.5) * 0.17, rr = R + 34 + (k % 2) * 12, fx = cx + Math.cos(b) * rr, fy = cy + Math.sin(b) * rr;
        s += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${fx.toFixed(1)}" y2="${fy.toFixed(1)}" stroke="var(--ligne)" stroke-width="1"/><circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="2.6" fill="var(--energie)" opacity="${on ? 0.95 : 0.55}"/>`;
      });
    });
    s += `<circle cx="${cx}" cy="${cy}" r="30" fill="var(--violet-sombre)" stroke="var(--neon)" stroke-width="1.4"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" style="font:600 12px var(--f-titre);fill:var(--texte)">Joka</text>`;
    CATS.forEach((c, i) => {
      const [x, y] = pos[i]; const n = el[c.id].length; const on = sel === c.id; const r = 13 + Math.min(10, Math.sqrt(n) * 2);
      const ty = y + (y > cy + 10 ? r + 15 : -r - 7);
      s += `<g class="noeud cat" role="button" tabindex="0" data-cat="${c.id}" aria-label="${esc(c.nom)} : ${n} élément(s)"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${on ? "var(--cyber)" : "var(--deep)"}" stroke="var(--neon)" stroke-width="${on ? 2 : 1.2}"/><text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" style="font:600 11px var(--f-mono);fill:var(--texte)">${n}</text><text x="${x.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle">${esc(c.nom)}</text></g>`;
    });
    return s + "</svg>";
  }
  function rendreMemoire() {
    const el = $("esp-memoire");
    if (!el.dataset.monte) {
      el.dataset.monte = "1";
      el.innerHTML = `<div class="titre-espace"><div><h1>Mémoire</h1><p>Ce que N.O.V.A sait de toi, d'où ça vient, et ce que tu peux changer.</p></div></div>
        <div class="segment" role="group" aria-label="Vue de la mémoire"><button data-seg="reseau">Réseau</button><button data-seg="sait">Ce qu'elle sait</button><button data-seg="docs">Documents</button></div>
        <div id="mem-reseau"></div><div id="mem-v1"></div>`;
      el.addEventListener("click", (e) => {
        const sg = e.target.closest("[data-seg]"); if (sg) { aller("memoire", sg.dataset.seg === "reseau" ? "" : sg.dataset.seg, true); return; }
        const n = e.target.closest("[data-cat]"); if (n) { E.memCat = E.memCat === n.dataset.cat ? null : n.dataset.cat; rendreMemoire(); return; }
        const x = e.target.closest("[data-memact]"); if (x) actionMemoire(x.dataset.memact, x.dataset.chemin, x.dataset.cat);
      });
      el.addEventListener("keydown", (e) => { const n = e.target.closest("[data-cat]"); if (n && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); n.dispatchEvent(new MouseEvent("click", { bubbles: true })); } });
      el.addEventListener("input", (e) => { if (e.target.id === "mem-q") { E.memRecherche = e.target.value; rendreListeMemoire(); } });
    }
    const seg = E.route.sous || "reseau";
    el.querySelectorAll("[data-seg]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.seg === seg)));
    $("mem-reseau").hidden = seg !== "reseau"; $("mem-v1").hidden = seg === "reseau";
    if (seg !== "reseau") return;
    const data = elementsMemoire(); E.memData = data;
    $("mem-reseau").innerHTML = `<div class="reseau-zone">${svgReseau(data, E.memCat)}</div>
      <div class="champ" style="margin-top:var(--e-4)"><label for="mem-q">Chercher dans la mémoire</label><input id="mem-q" type="search" enterkeyhint="search" autocomplete="off" value="${esc(E.memRecherche)}" placeholder="Un mot, un nom, un projet"></div>
      <div id="mem-liste" style="margin-top:var(--e-4)"></div>`;
    rendreListeMemoire();
  }
  function rendreListeMemoire() {
    const data = E.memData || elementsMemoire(); const q = E.memRecherche.trim().toLowerCase();
    const cats = E.memCat ? CATS.filter((c) => c.id === E.memCat) : CATS;
    let html = "";
    for (const c of cats) {
      let l = data[c.id]; if (q) l = l.filter((x) => (x.titre + " " + x.texte).toLowerCase().includes(q));
      if (!l.length && (q || !E.memCat)) continue;
      html += `<section class="carte fiche" aria-label="${esc(c.nom)}"><h2>${esc(c.nom)} <span class="mono">${l.length}</span></h2>`;
      html += l.length ? `<div class="liste">${l.slice(0, E.memCat ? 60 : 4).map((x) => `<div class="el"><div class="t"><b>${esc(x.titre)}</b><small>${esc(x.source)}, ${esc(x.confiance.toLowerCase())}${x.date ? ", le " + esc(new Date(x.date).toLocaleDateString("fr-FR")) : ""}</small></div>${x.chemin && /savoirs|journal/.test(x.chemin) ? `<button class="btn danger" data-memact="supprimer" data-chemin="${esc(x.chemin)}" aria-label="Supprimer ${esc(x.titre)}">Supprimer</button>` : ""}</div>`).join("")}</div>` : `<p class="vide">Rien ici pour l'instant.</p>`;
      html += `<div class="rangee" style="margin-top:var(--e-3)">${E.memCat ? "" : `<button class="btn" data-cat="${c.id}">Tout voir</button>`}${c.id === "profil" || c.id === "prefs" || c.id === "projets" || c.id === "decisions" ? `<button class="btn" data-memact="modifier">Modifier</button>` : ""}<button class="btn" data-memact="exporter" data-cat="${c.id}">Exporter</button></div></section>`;
    }
    $("mem-liste").innerHTML = html || `<p class="vide">${q ? "Aucun résultat pour « " + esc(q) + " »." : "La mémoire est vide. Importe tes données (Outils → Sauvegarde)."}</p>`;
  }
  async function actionMemoire(a, chemin, cat) {
    if (a === "modifier") { aller("memoire", "sait"); return; }
    if (a === "exporter") {
      const l = (E.memData || elementsMemoire())[cat] || [];
      const dl = await window.claude.use("downloads");
      try { await dl.save({ filename: "NOVA-memoire-" + cat + ".json", data: new Blob([JSON.stringify(l, null, 2)], { type: "application/json" }) }); } catch (e) {}
      return;
    }
    if (a === "supprimer" && chemin) {
      if (!confirm("Supprimer cet élément de la mémoire ? C'est définitif (sauf si tu as une sauvegarde).")) return;
      await S.doc(chemin).delete(); await NovaJournal.ajouter("memoire", "Supprimé par Joka : " + chemin.split("/").slice(-2).join("/"));
      E.memData = null; rendreMemoire(); toast("Supprimé.");
    }
  }

  /* ---------- LABO : l'évolution, mesurée et réversible ---------- */
  async function rendreLabo() {
    const el = $("esp-labo");
    if (!el.dataset.monte) {
      el.dataset.monte = "1";
      el.addEventListener("click", async (e) => {
        const b = e.target.closest("[data-lab]"); if (!b) return;
        const a = b.dataset.lab;
        if (a === "cycle") { b.disabled = true; const r = await NovaEvolution.cycle(true); b.disabled = false; toast(r ? `Cycle fini : ${r.appliques} appliqué(s), ${r.valides} gardé(s), ${r.annules} annulé(s), ${r.proposes} à valider.` : "Un cycle tourne déjà."); rendreLabo(); }
        else if (a === "oui" || a === "non") { await NovaEvolution.decider(b.dataset.cle, a === "oui"); rendreLabo(); majCompteurs(); }
        else if (a === "annuler") { const ok = await NovaEvolution.annuler(+b.dataset.at); toast(ok ? "Changement annulé, ancienne valeur remise." : "Ce changement ne peut pas être annulé."); rendreLabo(); }
      });
      NovaEvolution.ecouter(() => { if (E.route.espace === "labo") majCycle(); });
    }
    const ev = await NovaEvolution.etat(); const st = await NovaCerveau.stats();
    const gardes = ev.historique.filter((h) => h.statut === "validé" || h.statut === "appliqué").length;
    const annules = ev.historique.filter((h) => h.statut === "annulé").length;
    const tests = ev.historique.filter((h) => h.statut === "en test").length;
    const statut = { "en test": "En test", "validé": "Gardé", "appliqué": "Appliqué", "annulé": "Annulé", "refusé": "Refusé", "échec": "Échec" };
    el.innerHTML = `<div class="titre-espace"><div><h1>Labo</h1><p>Comment N.O.V.A s'améliore : mesuré, réversible, et toi qui décides de ce qui compte.</p></div></div>
      <section class="carte"><h2>Cycle d'évolution</h2><div class="cycle" id="lab-cycle">${NovaEvolution.ETAPES.map((x, i) => `<span class="etape" data-i="${i}">${x}</span>`).join("")}</div>
        <p class="sous" style="margin-top:var(--e-3)">${ev.dernier ? "Dernier cycle " + quand(ev.dernier) + "." : "Aucun cycle encore."} Il tourne seul toutes les 30 min quand l'appli est ouverte.</p>
        <div class="rangee" style="margin-top:var(--e-3)"><button class="btn principal" data-lab="cycle">${ic("cycle")}Lancer un cycle</button></div></section>
      <div class="chiffres"><div class="chiffre"><b>${ev.cycles}</b><span>cycles</span></div><div class="chiffre"><b>${gardes}</b><span>gardés</span></div><div class="chiffre"><b>${tests}</b><span>en test</span></div><div class="chiffre"><b>${annules}</b><span>annulés</span></div></div>
      <section class="carte"><h2>À valider par toi</h2>${ev.propositions.length ? `<div class="liste">${ev.propositions.map((p) => `<div class="el"><div class="t"><b>${esc(p.titre)}</b><small>${esc(p.detail || "")}</small><small>Domaine : ${esc(NovaEvolution.LIBELLES[p.cat] || p.cat)}</small><div class="rangee" style="margin-top:8px"><button class="btn principal" data-lab="oui" data-cle="${esc(p.cle)}">Accepter</button><button class="btn" data-lab="non" data-cle="${esc(p.cle)}">Refuser</button></div></div></div>`).join("")}</div>` : `<p class="vide">Rien à valider. Je te demanderai avant tout changement important.</p>`}</section>
      <section class="carte"><h2>Ce que j'ai appris</h2>${ev.apprentissages.length ? `<div class="liste">${ev.apprentissages.slice().reverse().slice(0, 10).map((a) => `<div class="el"><div class="t"><b>${esc(a.texte)}</b></div><time class="mono">${new Date(a.at).toLocaleDateString("fr-FR")}</time></div>`).join("")}</div>` : `<p class="vide">Rien encore : j'apprends en te regardant utiliser l'appli.</p>`}</section>
      <section class="carte"><h2>Changements</h2>${ev.historique.length ? `<div class="liste">${ev.historique.slice().reverse().slice(0, 15).map((h) => `<div class="el"><div class="t"><b>${esc(h.titre)}</b><small>${esc(statut[h.statut] || h.statut)}${h.niveau ? " (" + esc((NovaEvolution.NIVEAUX[h.niveau] || "").toLowerCase()) + ")" : ""}</small>${h.verdict ? `<small>${esc(h.verdict)}</small>` : ""}</div>${(h.statut === "validé" || h.statut === "appliqué" || h.statut === "en test") && /cerveau_ordre|cerveau_reglages|interface/.test(h.cat) ? `<button class="btn" data-lab="annuler" data-at="${h.at}">Annuler</button>` : ""}</div>`).join("")}</div>` : `<p class="vide">Aucun changement pour l'instant.</p>`}</section>
      <section class="carte"><h2>Cerveaux en ligne</h2>${Object.keys(st).length ? Object.entries(st).map(([f, x]) => { const r = x.recents || []; const ok = r.filter((y) => y.ok).length; return `<div class="ligne-kv"><span class="k">${esc((NovaCerveau.FOURNISSEURS[f] || {}).nom || f)}</span><span class="v">${r.length ? Math.round(ok / r.length * 100) + " %, " + (x.ms || "?") + " ms" : "pas mesuré"}</span></div>`; }).join("") : `<p class="vide">Pas encore d'appel mesuré.</p>`}</section>`;
    majCycle();
  }
  function majCycle() {
    const i = NovaEvolution.etape(); const c = $("lab-cycle"); if (!c) return;
    c.querySelectorAll(".etape").forEach((s) => { const k = +s.dataset.i; s.dataset.etat = i < 0 ? "" : k < i ? "fait" : k === i ? "encours" : ""; });
  }

  /* ---------- OUTILS ---------- */
  async function etatModule(m) {
    const c = await NovaCerveau.config(); const cle = Object.values(c.cles).some(Boolean);
    switch (m.id) {
      case "cerveau": return !cle ? ["autorisation", "Clé à ajouter"] : !c.autorise ? ["autorisation", "Autorisation nécessaire"] : navigator.onLine === false ? ["indisponible", "Hors ligne"] : ["actif", "Actif"];
      case "web": return c.cles.gemini && c.autorise ? ["actif", "Actif"] : ["disponible", "Wikipédia seulement"];
      case "voix": return (window.SpeechRecognition || window.webkitSpeechRecognition) ? ["disponible", "Disponible"] : window.speechSynthesis ? ["disponible", "Lecture seulement"] : ["indisponible", "Indisponible"];
      case "notifications": return (await NovaNtfy.config()).actif ? ["actif", "Actif"] : ["autorisation", "À activer"];
      case "automatisations": return (await NovaAgent.rituels()).actif ? ["actif", "Actif"] : ["disponible", "En pause"];
      case "sauvegarde": { const x = await S.kvLire("export_dernier"); return x ? ["disponible", quand(x.at)] : ["autorisation", "Jamais faite"]; }
      case "securite": return ["actif", "Actif"];
      case "fichiers": return ["disponible", (await S.blobsListe()).length + " fichiers"];
      case "ranger": { const n = V1() ? V1().aRanger().length : 0; return n ? ["autorisation", n + " à valider"] : ["disponible", "Disponible"]; }
      default: return ["disponible", "Disponible"];
    }
  }
  async function rendreOutils() {
    const el = $("esp-outils");
    if (!el.dataset.monte) { el.dataset.monte = "1"; el.addEventListener("click", (e) => { const b = e.target.closest("[data-mod]"); if (b) aller("outils", b.dataset.mod); }); }
    const ev = await NovaEvolution.etat(); const ordre = (ev.reglages && ev.reglages.ordreOutils) || [];
    const rang = (m) => { const i = ordre.indexOf(m.id); return i < 0 ? 99 + MODULES.indexOf(m) : i; };
    const carte = async (m) => { const [e, t] = await etatModule(m); return `<button class="module" data-mod="${m.id}">${ic(m.ic)}<span>${esc(m.nom)}</span><span class="puce" data-etat="${e}">${esc(t)}</span></button>`; };
    const vie = MODULES.filter((m) => m.groupe === "vie").sort((a, b) => rang(a) - rang(b));
    const sys = MODULES.filter((m) => m.groupe === "sys");
    el.innerHTML = `<div class="titre-espace"><div><h1>Outils</h1><p>Tous les modules de N.O.V.A, avec leur état réel.</p></div></div>
      <h2 class="groupe-titre">Ta vie</h2><div class="modules">${(await Promise.all(vie.map(carte))).join("")}</div>
      <h2 class="groupe-titre">Système</h2><div class="modules">${(await Promise.all(sys.map(carte))).join("")}</div>`;
  }

  /* ---------- panneaux système ---------- */
  async function rendreModule(m) {
    const el = $("esp-module");
    if (!m) { aller("outils", "", true); return; }
    if (m.tab) { el.querySelectorAll(".panneau").forEach((p) => p.remove()); return; }
    el.querySelectorAll(".panneau").forEach((p) => p.remove());
    const p = document.createElement("div"); p.className = "panneau espace"; p.style.animation = "none";
    el.appendChild(p);
    const f = PANNEAUX[m.id]; if (f) await f(p);
  }
  const lien = (u, t) => `<a href="${u}" target="_blank" rel="noopener noreferrer" style="color:var(--energie)">${esc(t)}</a>`;
  const interrupteur = (id, on, label) => `<button class="interrupteur" role="switch" id="${id}" aria-checked="${on ? "true" : "false"}" aria-label="${esc(label)}"></button>`;

  const PANNEAUX = {
    async cerveau(p) {
      const c = await NovaCerveau.config();
      const F = NovaCerveau.FOURNISSEURS;
      p.innerHTML = `<section class="carte"><h2>Mon cerveau en ligne</h2>
        <p class="sous">Sans lui, l'appli marche (planning, budget, mémoire…) et je réponds en « réflexes ». Avec lui, je réfléchis vraiment. Il est gratuit : il faut juste une clé, qui reste dans ton téléphone.</p>
        <div class="reglage" style="margin-top:var(--e-3)"><div><b>Autoriser le cerveau en ligne</b><span>Quand je réfléchis, ton message et les données utiles partent chez le fournisseur choisi. Avec la clé gratuite de Google, tes échanges peuvent servir à améliorer leurs produits.</span></div>${interrupteur("cv-ok", c.autorise, "Autoriser le cerveau en ligne")}</div></section>
        ${c.ordre.map((f, i) => `<section class="carte"><h2>${i + 1}. ${esc(F[f].nom)}</h2>
          <div class="champ"><label for="cv-${f}">Clé ${esc(F[f].nom.split(" ")[0])}</label><input id="cv-${f}" type="password" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" value="${esc(c.cles[f] || "")}" placeholder="Colle ta clé ici"></div>
          <p class="sous" style="margin-top:8px">${lien(F[f].cle, "Obtenir une clé gratuite")}</p><p class="sous">${[c.modeles[f] ? "Modèle : " + esc(c.modeles[f]) : "", F[f].images ? "lit les images" : "", F[f].recherche ? "cherche sur le web" : ""].filter(Boolean).join(", ")}</p>
          <div class="rangee" style="margin-top:var(--e-3)"><button class="btn" data-cv="sauver" data-f="${f}">Enregistrer</button><button class="btn" data-cv="tester" data-f="${f}">Tester</button>${c.cles[f] ? `<button class="btn danger" data-cv="effacer" data-f="${f}">Effacer la clé</button>` : ""}</div>
          <p class="sous" id="cv-r-${f}" role="status" style="margin-top:8px"></p></section>`).join("")}
        <p class="sous">Ordre d'essai : le 1 d'abord, puis les autres si le premier ne répond pas. Le Labo peut changer cet ordre tout seul s'il mesure qu'un autre marche mieux chez toi (et l'annule si c'est pire).</p>`;
      p.onclick = async (e) => {
        if (e.target.closest("#cv-ok")) {
          const sw = $("cv-ok"); const on = sw.getAttribute("aria-checked") !== "true";
          await NovaCerveau.regler({ autorise: on }); sw.setAttribute("aria-checked", String(on));
          await NovaJournal.ajouter("securite", on ? "Cerveau en ligne autorisé par Joka" : "Cerveau en ligne coupé par Joka"); majTout(); return;
        }
        const b = e.target.closest("[data-cv]"); if (!b) return; const f = b.dataset.f; const out = $("cv-r-" + f);
        const cfg = await NovaCerveau.config();
        if (b.dataset.cv === "sauver" || b.dataset.cv === "tester") {
          const v = $("cv-" + f).value.trim(); if (v !== (cfg.cles[f] || "")) { cfg.cles[f] = v; cfg.modeles[f] = ""; await NovaCerveau.regler({ cles: cfg.cles, modeles: cfg.modeles }); }
          if (b.dataset.cv === "sauver") { out.textContent = v ? "Clé enregistrée dans ton téléphone." : "Clé vide."; majTout(); return; }
          out.textContent = "Test en cours…"; b.disabled = true;
          const r = await NovaCerveau.tester(f); b.disabled = false;
          out.textContent = r.ok ? `Ça marche : ${r.modele}, réponse en ${r.ms} ms.` : "Échec : " + r.erreur;
          await NovaJournal.ajouter("cerveau", `Test ${f} : ${r.ok ? "OK (" + r.ms + " ms)" : "échec"}`); majTout();
        } else if (b.dataset.cv === "effacer") {
          if (!confirm("Effacer cette clé du téléphone ?")) return;
          delete cfg.cles[f]; await NovaCerveau.regler({ cles: cfg.cles }); rendreModule(MOD.cerveau); majTout();
        }
      };
    },
    async web(p) {
      p.innerHTML = `<section class="carte"><h2>Recherche web</h2><p class="sous">Avec une clé Gemini autorisée, je cherche sur Google et je donne mes sources. Sinon, seulement Wikipédia (savoir général, pas l'actualité).</p>
        <form id="web-f" class="champ" style="margin-top:var(--e-3)"><label for="web-q">Ta question</label><input id="web-q" type="search" enterkeyhint="search" autocomplete="off" placeholder="Ex. horaires de la CAF de Toulon"><button class="btn principal" style="margin-top:8px">Chercher</button></form>
        <div id="web-r" style="margin-top:var(--e-4)"></div></section>`;
      $("web-f").onsubmit = async (e) => {
        e.preventDefault(); const q = $("web-q").value.trim(); if (!q) return; const r = $("web-r");
        r.innerHTML = `<div class="squelette"></div>`; NovaCoeur.etat("recherche");
        try {
          const x = await NovaCerveau.recherche(q);
          r.innerHTML = `${x.note ? `<p class="sous">${esc(x.note)}</p>` : ""}${x.texte ? `<p style="white-space:pre-wrap">${esc(x.texte)}</p>` : ""}${(x.sources || []).length ? `<div class="liste">${x.sources.map((s) => `<div class="el"><div class="t"><b>${lien(s.url, s.titre || s.url)}</b>${s.extrait ? `<small>${esc(s.extrait)}</small>` : ""}</div></div>`).join("")}</div>` : `<p class="vide">Aucune source trouvée.</p>`}`;
          await NovaJournal.ajouter("recherche", "Recherche : " + q.slice(0, 80));
        } catch (er) { r.innerHTML = `<p class="vide">Recherche impossible : ${esc(er.message)}</p>`; }
        NovaCoeur.etat(navigator.onLine === false ? "horsligne" : "veille");
      };
    },
    async voix(p) {
      const v = (await S.kvLire("voix")) || {}; const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const voix = window.speechSynthesis ? speechSynthesis.getVoices().filter((x) => /^fr/.test(x.lang)) : [];
      p.innerHTML = `<section class="carte"><h2>Voix</h2>
        <div class="reglage"><div><b>Parler à N.O.V.A</b><span>${SR ? "Touche le noyau sur l'Accueil et parle. Pas encore testé sur ton iPhone : dis-moi si ça coince." : "La dictée de Safari n'est pas disponible ici : utilise le micro du clavier."}</span></div>${SR ? `<button class="btn" data-vx="ecoute">Tester</button>` : ""}</div>
        <div class="reglage"><div><b>Lire ses réponses à voix haute</b><span>Quand l'appli est ouverte.</span></div>${interrupteur("vx-lec", !!v.lecture, "Lire les réponses à voix haute")}</div>
        ${voix.length ? `<div class="champ" style="margin-top:var(--e-3)"><label for="vx-nom">Voix</label><select id="vx-nom">${voix.map((x) => `<option${x.name === v.nom ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select></div>` : ""}
        <div class="rangee" style="margin-top:var(--e-3)"><button class="btn" data-vx="test">Écouter un essai</button></div></section>
        <section class="carte"><h2>Affichage</h2><div class="reglage"><div><b>Moins d'animations</b><span>Le noyau reste fixe, il change seulement de couleur et de forme selon l'état.</span></div>${interrupteur("vx-calme", document.documentElement.dataset.calme === "1", "Moins d'animations")}</div></section>`;
      p.onclick = async (e) => {
        const cur = (await S.kvLire("voix")) || {};
        if (e.target.closest("#vx-lec")) { cur.lecture = !cur.lecture; await S.kvMettre("voix", cur); $("vx-lec").setAttribute("aria-checked", String(cur.lecture)); return; }
        if (e.target.closest("#vx-calme")) { const on = document.documentElement.dataset.calme !== "1"; document.documentElement.dataset.calme = on ? "1" : "0"; await S.kvMettre("calme", on); $("vx-calme").setAttribute("aria-checked", String(on)); NovaCoeur.rafraichir(); return; }
        const b = e.target.closest("[data-vx]"); if (!b) return;
        if (b.dataset.vx === "ecoute") { aller("accueil"); setTimeout(parler, 300); }
        if (b.dataset.vx === "test") { const sauve = cur.lecture; cur.lecture = true; await S.kvMettre("voix", cur); await lireAVoixHaute("Bonjour Joka, je suis N.O.V.A. Voilà ma voix."); cur.lecture = sauve; await S.kvMettre("voix", cur); }
      };
      p.onchange = async (e) => { if (e.target.id === "vx-nom") { const cur = (await S.kvLire("voix")) || {}; cur.nom = e.target.value; await S.kvMettre("voix", cur); } };
    },
    async notifications(p) {
      const c = await NovaNtfy.regler({});
      p.innerHTML = `<section class="carte"><h2>Rappels par ntfy</h2><p class="sous">L'appli ne tourne pas en fond sur iPhone. Pour être prévenu (check-in, bilan), elle confie tes rappels à l'heure prévue à ntfy, une appli gratuite. Le texte des rappels reste général : aucun montant, aucun détail privé.</p>
        <div class="liste" style="margin-top:var(--e-3)">
          <div class="el"><div class="t"><b>1. Installe ntfy</b><small>${lien("https://apps.apple.com/search?term=ntfy", "Chercher ntfy dans l'App Store")}</small></div></div>
          <div class="el"><div class="t"><b>2. Dans ntfy, touche + et abonne-toi à ce sujet</b><small class="mono" id="nt-sujet" style="user-select:all;-webkit-user-select:all">${esc(c.sujet)}</small></div><button class="btn" data-nt="copier">Copier</button></div>
          <div class="el"><div class="t"><b>3. Active ici et envoie un test</b><small>Serveur : ${esc(c.serveur)}</small></div>${interrupteur("nt-on", c.actif, "Activer les rappels ntfy")}</div>
        </div>
        <div class="rangee" style="margin-top:var(--e-3)"><button class="btn principal" data-nt="test">Envoyer un test</button></div><p class="sous" id="nt-r" role="status" style="margin-top:8px"></p></section>
        <section class="carte"><h2>Garde ce sujet secret</h2><p class="sous">Toute personne qui connaît ce nom peut lire tes rappels. Il est tiré au hasard ; ne le partage pas.</p></section>`;
      p.onclick = async (e) => {
        if (e.target.closest("#nt-on")) { const cur = await NovaNtfy.config(); const on = !cur.actif; await NovaNtfy.regler({ actif: on }); $("nt-on").setAttribute("aria-checked", String(on)); await NovaJournal.ajouter("securite", on ? "Rappels ntfy activés" : "Rappels ntfy coupés"); if (on) await NovaAgent.planifierRituels(); majTout(); return; }
        const b = e.target.closest("[data-nt]"); if (!b) return;
        if (b.dataset.nt === "copier") { try { await navigator.clipboard.writeText(c.sujet); toast("Sujet copié."); } catch (er) { toast("Sélectionne le sujet et copie-le."); } }
        if (b.dataset.nt === "test") { const r = await NovaNtfy.envoyer({ titre: "Test N.O.V.A", texte: "Si tu lis ça, les rappels marchent.", tags: "white_check_mark" }); $("nt-r").textContent = r.ok ? "Envoyé. Regarde ton téléphone." : "Pas envoyé : " + r.raison; }
      };
    },
    async automatisations(p) {
      const R = await NovaAgent.rituels(); const pro = NovaAgent.prochainsRituels(R, Date.now(), 3);
      p.innerHTML = `<section class="carte"><h2>Rituels</h2><p class="sous">Check-in du matin et bilan du soir. Quand l'heure passe, je les fais à la prochaine ouverture de l'appli (dans les 4 h), et ntfy te le rappelle si c'est activé.</p>
        <div class="reglage"><div><b>Rituels actifs</b></div>${interrupteur("au-on", R.actif, "Rituels actifs")}</div>
        <div class="rangee" style="margin-top:var(--e-3)"><div class="champ" style="flex:1"><label for="au-m">Matin</label><input id="au-m" type="time" value="${esc(R.matin)}"></div><div class="champ" style="flex:1"><label for="au-s">Soir</label><input id="au-s" type="time" value="${esc(R.soir)}"></div></div>
        <div class="rangee" style="margin-top:var(--e-3)"><button class="btn principal" data-au="sauver">Enregistrer</button></div><p class="sous" id="au-r" role="status"></p></section>
        <section class="carte"><h2>Prochains</h2>${pro.length ? `<div class="liste">${pro.map((x) => `<div class="el"><div class="t"><b>${esc(x.label)}</b></div><time class="mono">${esc(NovaAgent.heureLisible(x.at))}</time></div>`).join("")}</div>` : `<p class="vide">Rituels en pause.</p>`}</section>
        <section class="carte"><h2>Évolution</h2><p class="sous">Un cycle d'amélioration tourne toutes les 30 min quand l'appli est ouverte. Détails dans le Labo.</p></section>`;
      p.onclick = async (e) => {
        if (e.target.closest("#au-on")) { const on = $("au-on").getAttribute("aria-checked") !== "true"; await NovaAgent.regler({ actif: on }); $("au-on").setAttribute("aria-checked", String(on)); return; }
        if (e.target.closest("[data-au]")) { await NovaAgent.regler({ matin: $("au-m").value || "08:30", soir: $("au-s").value || "22:25" }); await NovaJournal.ajouter("rituels", "Heures des rituels changées par Joka"); $("au-r").textContent = "Enregistré."; rendreModule(MOD.automatisations); }
      };
    },
    async sauvegarde(p) {
      const sto = await S.stockage(); const exp = await S.kvLire("export_dernier"); const imp = await S.kvLire("import_dernier");
      p.innerHTML = `<section class="carte"><h2>Importer mes données</h2><p class="sous">Choisis le fichier « NOVA-donnees-….json » (ou une sauvegarde de l'appli) dans l'app Fichiers. Je te montre ce qu'il contient avant d'écrire quoi que ce soit.</p>
          <label class="btn principal" style="margin-top:var(--e-3)">${ic("importer")}Choisir le fichier<input id="sv-f" type="file" class="sr-seul"></label>
          <div id="sv-apercu" style="margin-top:var(--e-3)"></div>${imp ? `<p class="sous" style="margin-top:8px">Dernier import ${quand(imp.at)} : ${imp.ecrits} éléments, ${imp.fichiers} fichiers.</p>` : ""}</section>
        <section class="carte"><h2>Sauvegarder</h2><p class="sous">Crée un fichier avec tout (discussions, mémoire, budget, planning, fichiers). Range-le dans Fichiers ou iCloud. Les clés du cerveau n'y sont pas.</p>
          <div class="rangee" style="margin-top:var(--e-3)"><button class="btn principal" data-sv="exporter">${ic("sauvegarde")}Créer la sauvegarde</button></div><p class="sous" id="sv-r" role="status" style="margin-top:8px">${exp ? "Dernière : " + quand(exp.at) + "." : "Aucune sauvegarde encore."}</p></section>
        <section class="carte"><h2>Stockage du téléphone</h2>
          <div class="ligne-kv"><span class="k">Utilisé</span><span class="v">${octets(sto.utilise || 0)}</span></div>
          <div class="ligne-kv"><span class="k">Protégé contre le nettoyage d'iOS</span><span class="v" data-etat="${sto.persiste ? "ok" : "att"}">${sto.persiste ? "Oui" : "Pas encore"}</span></div>
          <p class="sous" style="margin-top:8px">iOS protège mieux les données d'une appli installée sur l'écran d'accueil. Garde quand même une sauvegarde récente.</p></section>`;
      p.onchange = async (e) => {
        if (e.target.id !== "sv-f") return; const f = e.target.files && e.target.files[0]; const ap = $("sv-apercu");
        ap.innerHTML = `<div class="squelette"></div>`;
        try {
          E.import = await NovaSauvegarde.lire(f);
          const L = E.import;
          if (L.profil) {
            ap.innerHTML = `<div class="liste"><div class="el"><div class="t"><b>Profil personnel : ${L.profil.remplacements.length} noms à remettre</b><small>Ils restent dans ton téléphone, jamais dans le code public.</small></div></div></div><div class="rangee" style="margin-top:var(--e-3)"><button class="btn principal" data-sv="profil">Importer le profil</button></div><div id="sv-prog" class="sous" role="status" style="margin-top:8px"></div>`;
            return;
          }
          ap.innerHTML = `<div class="liste">${L.lignes.map((l) => `<div class="el"><div class="t"><b>${esc(l)}</b></div></div>`).join("")}</div>
            ${L.annonce ? `<p class="sous">Annoncé par le fichier : ${L.annonce.documents} éléments, ${L.annonce.fichiers} fichiers.</p>` : ""}
            ${L.erreursSource.length ? `<p class="sous" style="color:var(--attention)">Le fichier signale ${L.erreursSource.length} souci(s) à la copie : ${esc(L.erreursSource.slice(0, 3).join(" ; "))}</p>` : ""}
            <div class="rangee" style="margin-top:var(--e-3)"><button class="btn principal" data-sv="importer">Importer ${L.total + L.fichiers.length} éléments</button></div>
            <div id="sv-prog" class="sous" role="status" style="margin-top:8px"></div>`;
        } catch (er) { ap.innerHTML = `<p class="vide">${esc(er.message)}</p>`; E.import = null; }
      };
      p.onclick = async (e) => {
        const b = e.target.closest("[data-sv]"); if (!b) return;
        if (b.dataset.sv === "importer" && E.import) {
          b.disabled = true; const pr = $("sv-prog"); NovaCoeur.etat("reflexion", "J'importe tes données…");
          const r = await NovaSauvegarde.importer(E.import, { mode: "fusion", progres: (x) => { pr.textContent = "Import… " + Math.round(x * 100) + " %"; } });
          E.import = null; NovaCoeur.etat("veille");
          pr.innerHTML = `C'est fait : ${r.ecrits} éléments et ${r.fichiers} fichiers copiés${r.gardes ? `, ${r.gardes} plus récents gardés` : ""}.${r.erreurs.length ? ` ${r.erreurs.length} souci(s) : ${esc(r.erreurs.slice(0, 3).join(" ; "))}` : ""}<br><button class="btn principal" data-sv="relancer" style="margin-top:8px">Relancer l'appli</button>`;
        }
        if (b.dataset.sv === "profil" && E.import && E.import.profil) {
          await NovaSauvegarde.importerProfil(E.import.profil); E.import = null;
          $("sv-prog").innerHTML = `Profil importé.<br><button class="btn principal" data-sv="relancer" style="margin-top:8px">Relancer l'appli</button>`;
        }
        if (b.dataset.sv === "relancer") location.reload();
        if (b.dataset.sv === "exporter") {
          b.disabled = true; $("sv-r").textContent = "Je prépare le fichier…";
          try { const r = await NovaSauvegarde.exporter(); $("sv-r").textContent = `Sauvegarde prête : ${r.total.documents} éléments, ${r.total.fichiers} fichiers (${octets(r.taille)}).`; }
          catch (er) { $("sv-r").textContent = er && er.code === "cancelled" ? "Annulé." : "Sauvegarde impossible : " + (er.message || er); }
          b.disabled = false; majTout();
        }
      };
    },
    async fichiers(p) {
      const l = await S.blobsListe();
      p.innerHTML = `<section class="carte"><h2>Fichiers dans le téléphone</h2>${l.length ? `<div class="liste">${l.sort((a, b) => (b.created || 0) - (a.created || 0)).map((f) => `<div class="el"><div class="t"><b>${esc(f.type || "fichier")}</b><small class="mono">${esc(f.id.slice(0, 10))}…, ${octets(f.size || 0)}</small></div><button class="btn" data-fi="${esc(f.id)}">Ouvrir</button></div>`).join("")}</div>` : `<p class="vide">Aucun fichier. Ceux que tu donnes à N.O.V.A (documents, relevés, photos) apparaîtront ici.</p>`}</section>`;
      p.onclick = async (e) => { const b = e.target.closest("[data-fi]"); if (!b) return; const x = await S.blobLire(b.dataset.fi); if (x) window.open(URL.createObjectURL(x.blob), "_blank"); };
    },
    async securite(p) {
      const P = await NovaEvolution.permissions(); const N = NovaEvolution.NIVEAUX;
      const j = (await NovaJournal.derniers(40)).filter((o) => o.type === "securite").slice(0, 8);
      p.innerHTML = `<section class="carte"><h2>Ce que N.O.V.A peut faire seule</h2><p class="sous">Automatique : elle le fait et le note. Surveillé : elle le fait, le mesure et l'annule si c'est pire. Validation obligatoire : elle te demande d'abord.</p>
        ${Object.keys(NovaEvolution.LIBELLES).map((k) => `<div class="reglage empile"><div><b>${esc(NovaEvolution.LIBELLES[k])}</b>${NovaEvolution.VERROUILLEES.includes(k) ? "<span>Toujours avec ta validation.</span>" : ""}</div>${NovaEvolution.VERROUILLEES.includes(k) ? "" : `<div class="segment" role="group" aria-label="${esc(NovaEvolution.LIBELLES[k])}">${Object.entries(N).map(([n]) => `<button data-perm="${k}" data-niv="${n}" aria-pressed="${P[k] === n}">${esc({ auto: "Automatique", surveille: "Surveillé", validation: "Me demander" }[n])}</button>`).join("")}</div>`}</div>`).join("")}</section>
        <section class="carte"><h2>Tes données</h2><p class="sous">Tout est dans ce téléphone (IndexedDB). Rien n'est envoyé ailleurs, sauf ce que le cerveau en ligne reçoit pour réfléchir quand tu l'autorises, et le texte général des rappels ntfy. Le code de l'appli est public, tes données jamais.</p></section>
        <section class="carte"><h2>Journal de sécurité</h2>${j.length ? `<div class="liste">${j.map((o) => `<div class="el"><div class="t"><b>${esc(o.texte)}</b></div><time class="mono">${new Date(o.ts).toLocaleDateString("fr-FR")}</time></div>`).join("")}</div>` : `<p class="vide">Aucun changement de sécurité.</p>`}</section>
        <section class="carte"><h2>Tout effacer</h2><p class="sous">Efface toutes tes données de ce téléphone. Fais d'abord une sauvegarde.</p><div class="rangee" style="margin-top:var(--e-3)"><button class="btn danger" data-sec="effacer">Effacer toutes mes données</button></div></section>`;
      p.onclick = async (e) => {
        const b = e.target.closest("[data-perm]");
        if (b) { await NovaEvolution.reglerPermission(b.dataset.perm, b.dataset.niv); rendreModule(MOD.securite); return; }
        if (e.target.closest("[data-sec]")) {
          if (!confirm("Effacer TOUTES tes données de ce téléphone ? Discussions, mémoire, budget, fichiers. C'est définitif.")) return;
          if (prompt("Pour confirmer, écris EFFACER") !== "EFFACER") { toast("Rien n'a été effacé."); return; }
          await S.toutEffacer(); await S.kvMettre("planning", PLANNING_VIDE); toast("Tout est effacé."); setTimeout(() => location.reload(), 800);
        }
      };
    },
  };

  /* ---------- compteurs des onglets, rafraîchissements ---------- */
  async function majCompteurs() {
    const ev = await NovaEvolution.etat(); const ar = V1() ? V1().aRanger().length : 0;
    const set = (k, n) => { const b = document.querySelector(`.onglet[data-espace="${k}"] .compte`); if (b) { b.hidden = !n; b.textContent = n > 9 ? "9+" : String(n); } };
    set("labo", ev.propositions.length); set("outils", ar);
  }
  let majT = 0;
  function majTout() {
    clearTimeout(majT);
    majT = setTimeout(() => {
      majBarre(); majCompteurs();
      const r = E.route;
      if (r.espace === "accueil") rendreAccueil();
      else if (r.espace === "labo") rendreLabo();
      else if (r.espace === "outils" && !r.sous) rendreOutils();
    }, 120);
  }

  /* ---------- démarrage ---------- */
  async function chargerScript(src) {
    return new Promise((ok, ko) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => ko(new Error("chargement impossible : " + src)); document.body.appendChild(s); });
  }
  /* le code v1 public est neutre ; le profil gardé dans le téléphone lui rend les vrais noms (jamais dans le dépôt) */
  async function chargerV1() {
    const profil = await S.kvLire("profil");
    const paires = profil && Array.isArray(profil.remplacements) ? profil.remplacements.filter((p) => Array.isArray(p) && p.length === 2 && p[0]) : [];
    if (!paires.length) return chargerScript("js/v1.js");
    const r = await fetch("js/v1.js"); if (!r.ok) throw new Error("code v1 introuvable");
    let src = await r.text();
    for (const [neutre, reel] of paires) src = src.split(String(neutre)).join(String(reel));
    const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    try { await chargerScript(url); } finally { URL.revokeObjectURL(url); }
  }
  async function demarrer() {
    $("onglets").innerHTML = ESPACES.map(([k, t]) => `<button class="onglet" data-espace="${k}" aria-current="false">${ic(k)}<span>${t}</span><span class="compte" hidden></span></button>`).join("");
    $("onglets").addEventListener("click", (e) => { const b = e.target.closest(".onglet"); if (b) aller(b.dataset.espace); });
    $("retour").innerHTML = ic("retour") + "Outils"; $("retour").onclick = () => (history.length > 1 && /#outils\//.test(location.hash) ? history.back() : aller("outils"));
    NovaCoeur.monter($("noyau-mini"), { mini: true });
    NovaCoeur.ecouter((etat, phrase) => {
      majBarre();
      const n = $("noyau-nom"), ph = $("noyau-phrase");
      if (n) { n.textContent = NovaCoeur.ETATS[etat].nom; ph.textContent = phrase; }
    });
    await S.ouvrir();
    if ((await S.kvLire("calme")) === true) document.documentElement.dataset.calme = "1";
    /* le planning (privé) vient du téléphone, jamais du code */
    const pl = (await S.kvLire("planning")) || PLANNING_VIDE;
    $("state").textContent = JSON.stringify(pl);
    E.route = lireRoute();
    try { localStorage.setItem("nova-tab", tabVoulu(E.route) || "nova"); } catch (e) {}
    await chargerV1();
    E.v1pret = !!window.NovaV1;
    new MutationObserver(() => { suivreV1(); if (E.route.espace === "accueil") majTraiterDiffere(); }).observe($("app"), { childList: true });
    afficher();
    addEventListener("online", majTout); addEventListener("offline", majTout);
    ["nova:journal", "nova:evolution", "nova:cerveau", "nova:attente"].forEach((ev) => addEventListener(ev, majTout));
    document.addEventListener("visibilitychange", () => { if (!document.hidden) majTout(); });
    /* lire à voix haute les nouvelles réponses (si activé) */
    const debut = Date.now();
    S.collection(B + "nova/chat").orderBy("ts", "desc").limit(1).onSnapshot((s) => {
      const d = s.docs[0] && s.docs[0].data(); if (d && d.role === "nova" && d.ts > debut && !d.reflexe) lireAVoixHaute(d.text);
    });
    /* l'état de travail de N.O.V.A (écrit par l'agent) pilote aussi le noyau */
    S.doc(B + "nova").onSnapshot((s) => { const d = s.data() || {}; if (d.state === "working" && NovaCoeur.actuel().etat === "veille") NovaCoeur.etat("reflexion", "N.O.V.A réfléchit… " + (d.note ? "(" + d.note + ")" : "")); majBarre(); });
    await NovaAgent.demarrer();
    if (!(await NovaCerveau.pret()) && navigator.onLine !== false) { const et = await NovaCerveau.etatTexte(); NovaCoeur.etat("veille", et.code === "cle" ? "Ajoute une clé gratuite (Outils → Cerveau) pour que je réfléchisse." : et.code === "autorisation" ? "Autorise mon cerveau en ligne (Outils → Cerveau)." : NovaCoeur.ETATS.veille.phrase); }
    NovaEvolution.demarrer();
    majTout();
    enregistrerSW();
    /* clavier iOS : la barre d'écriture reste visible au-dessus */
    if (window.visualViewport) {
      const f = () => { const k = Math.max(0, innerHeight - visualViewport.height - visualViewport.offsetTop); document.documentElement.style.setProperty("--clavier", k + "px"); document.body.classList.toggle("clavier", k > 80); };
      visualViewport.addEventListener("resize", f); visualViewport.addEventListener("scroll", f);
    }
  }
  let trT = 0; function majTraiterDiffere() { clearTimeout(trT); trT = setTimeout(() => { if (E.route.espace === "accueil") accTraiter(); }, 600); }

  /* ---------- mises à jour du code : toujours avec l'accord de Joka ---------- */
  function enregistrerSW() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    navigator.serviceWorker.register("sw.js").then((reg) => {
      const proposer = (w) => {
        const d = document.createElement("div"); d.className = "toast-nova"; d.setAttribute("role", "status");
        d.innerHTML = `Une nouvelle version de N.O.V.A est prête. <button class="btn principal" style="margin-left:8px;min-height:36px">Mettre à jour</button>`;
        d.querySelector("button").onclick = () => { w.postMessage("activer"); NovaJournal.ajouter("evolution", "Mise à jour du code acceptée par Joka"); };
        document.body.appendChild(d);
      };
      if (reg.waiting && navigator.serviceWorker.controller) proposer(reg.waiting);
      reg.addEventListener("updatefound", () => { const w = reg.installing; w && w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) proposer(w); }); });
      setInterval(() => reg.update().catch(() => {}), 60 * 60000);
    }).catch(() => {});
    let recharge = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (!recharge) { recharge = true; location.reload(); } });
  }

  window.NovaCoque = { aller, toast, parler, majTout };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer); else demarrer();
})();
