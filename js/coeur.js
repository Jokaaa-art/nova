/* N.O.V.A — le noyau (signature visuelle). Anneaux HUD + icosaèdre en fil de fer, dessinés au canvas.
   L'état affiché est TOUJOURS l'état réel de l'appli (veille, écoute, réflexion, recherche, réponse, erreur, hors connexion).
   Couleurs lues dans les jetons CSS. 60 i/s, en pause quand l'écran est caché ; image fixe si « moins d'animations ». */
(function () {
  "use strict";
  const ETATS = {
    veille:     { nom: "En veille",        phrase: "Je suis là. Touche-moi pour parler.", vit: 0.18, coul: "neon" },
    ecoute:     { nom: "Écoute",           phrase: "Je t'écoute…",                       vit: 0.35, coul: "energie" },
    reflexion:  { nom: "Réflexion",        phrase: "Je réfléchis…",                      vit: 1.15, coul: "neon" },
    recherche:  { nom: "Recherche",        phrase: "Je cherche l'information…",          vit: 0.8,  coul: "energie" },
    reponse:    { nom: "Réponse",          phrase: "Je te réponds.",                     vit: 0.5,  coul: "energie" },
    erreur:     { nom: "Erreur",           phrase: "Quelque chose a échoué.",            vit: 0.08, coul: "erreur" },
    horsligne:  { nom: "Hors connexion",   phrase: "Pas d'Internet : je garde tes demandes pour plus tard.", vit: 0.1, coul: "horsligne" },
  };
  const instances = new Set();
  const ecouteurs = new Set();
  let etat = "veille", phrase = ETATS.veille.phrase, depuis = performance.now(), niveau = 0, niveauCible = 0;
  const calme = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.calme === "1";

  /* icosaèdre unité */
  const p = (1 + Math.sqrt(5)) / 2;
  const V = [[-1,p,0],[1,p,0],[-1,-p,0],[1,-p,0],[0,-1,p],[0,1,p],[0,-1,-p],[0,1,-p],[p,0,-1],[p,0,1],[-p,0,-1],[-p,0,1]]
    .map(([x, y, z]) => { const n = Math.hypot(x, y, z); return [x / n, y / n, z / n]; });
  const A = [];
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) {
    const d = Math.hypot(V[i][0] - V[j][0], V[i][1] - V[j][1], V[i][2] - V[j][2]);
    if (d < 1.1) A.push([i, j]);
  }

  function couleurs() {
    const cs = getComputedStyle(document.documentElement);
    const g = (n, d) => (cs.getPropertyValue(n) || d).trim();
    return { neon: g("--neon", "#9D5CFF"), energie: g("--energie", "#D3B5FF"), cyber: g("--cyber", "#7029D9"),
      erreur: g("--erreur", "#FF6B86"), horsligne: g("--horsligne", "#F2B84B"), texte: g("--texte", "#E8E0F5"), void: g("--void", "#08060D") };
  }
  let C = null;
  function rgba(hex, a) {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function Instance(canvas, opts) {
    this.c = canvas; this.ctx = canvas.getContext("2d"); this.mini = !!(opts && opts.mini);
    this.visible = true; this.t0 = performance.now(); this.rot = 0; this.angle = 0; this.pings = [];
    this.taille();
    if ("IntersectionObserver" in window) {
      this.io = new IntersectionObserver((e) => { this.visible = e[0].isIntersecting; if (this.visible) boucle(); });
      this.io.observe(canvas);
    }
  }
  Instance.prototype.taille = function () {
    const r = this.c.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(16, Math.round(r.width || this.c.width)), h = Math.max(16, Math.round(r.height || this.c.height));
    this.c.width = w * dpr; this.c.height = h * dpr; this.w = w; this.h = h; this.dpr = dpr;
  };
  Instance.prototype.dessiner = function (now, dt) {
    const ctx = this.ctx, E = ETATS[etat], w = this.w, h = this.h, cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) * 0.46, mini = this.mini;
    const coul = C[E.coul] || C.neon, coul2 = etat === "erreur" || etat === "horsligne" ? coul : C.energie;
    const fige = calme();
    const v = E.vit;
    if (!fige) { this.rot += dt * v; this.angle += dt * (0.6 + v); }
    const t = fige ? 0 : (now - this.t0) / 1000;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";

    /* lueur centrale : respiration */
    const souffle = fige ? 0.8 : 0.72 + 0.18 * Math.sin(t * (etat === "reflexion" ? 3.2 : 1.4)) + niveau * 0.35;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.9);
    g.addColorStop(0, rgba(coul2, 0.55 * souffle));
    g.addColorStop(0.35, rgba(coul, 0.22 * souffle));
    g.addColorStop(1, rgba(coul, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 0.9, 0, Math.PI * 2); ctx.fill();

    /* anneau extérieur gradué */
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.rot * 0.25);
    ctx.strokeStyle = rgba(coul, 0.55); ctx.lineWidth = mini ? 1 : 1.2;
    if (etat === "horsligne") ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    if (!mini) {
      for (let i = 0; i < 72; i++) {
        const long = i % 6 === 0, a = (i / 72) * Math.PI * 2;
        ctx.strokeStyle = rgba(coul, long ? 0.75 : 0.32); ctx.lineWidth = long ? 1.4 : 1;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * (R - (long ? 9 : 5)), Math.sin(a) * (R - (long ? 9 : 5)));
        ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.stroke();
      }
    }
    ctx.restore();

    /* arcs segmentés (sens inverse) */
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-this.rot * 0.8);
    const r2 = R * 0.84, segs = etat === "erreur" ? [[0, 0.5], [0.9, 1.2], [2.6, 2.75], [4, 4.6]] : [[0, 1.4], [2.1, 3.3], [4.0, 5.6]];
    ctx.lineWidth = mini ? 1.6 : 2.6; ctx.strokeStyle = rgba(coul2, 0.85);
    segs.forEach(([a, b]) => { ctx.beginPath(); ctx.arc(0, 0, r2, a, b); ctx.stroke(); });
    ctx.restore();

    if (!mini) {
      /* anneau pointillé */
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.rot * 0.5);
      ctx.setLineDash([2, 7]); ctx.strokeStyle = rgba(coul, 0.5); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.72, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();

      /* écoute : barres radiales liées au niveau du micro */
      if (etat === "ecoute") {
        ctx.save(); ctx.translate(cx, cy);
        for (let i = 0; i < 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          const amp = (0.25 + niveau) * (0.5 + 0.5 * Math.sin(t * 6 + i * 0.9)) * R * 0.14;
          ctx.strokeStyle = rgba(C.energie, 0.7); ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.58, Math.sin(a) * R * 0.58);
          ctx.lineTo(Math.cos(a) * (R * 0.58 + amp), Math.sin(a) * (R * 0.58 + amp)); ctx.stroke();
        }
        ctx.restore();
      }
      /* réponse : onde circulaire */
      if (etat === "reponse") {
        ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = rgba(C.energie, 0.8); ctx.lineWidth = 1.6; ctx.beginPath();
        for (let i = 0; i <= 120; i++) {
          const a = (i / 120) * Math.PI * 2;
          const rr = R * 0.6 + Math.sin(a * 6 + t * 5) * R * 0.035 * (0.6 + niveau) + Math.sin(a * 11 - t * 3) * R * 0.018;
          i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath(); ctx.stroke(); ctx.restore();
      }
      /* réflexion : satellites en orbite */
      if (etat === "reflexion") {
        ctx.save(); ctx.translate(cx, cy);
        [[0.64, 1.9, 0], [0.64, 1.9, Math.PI], [0.52, -2.7, 1.2]].forEach(([rr, s, o]) => {
          const a = t * s + o; ctx.fillStyle = C.energie; ctx.shadowColor = C.neon; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(Math.cos(a) * R * rr, Math.sin(a) * R * rr, 3, 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
      }
      /* recherche : balayage radar + échos */
      if (etat === "recherche") {
        ctx.save(); ctx.translate(cx, cy);
        const a = t * 2.2;
        const grd = ctx.createLinearGradient(0, 0, Math.cos(a) * R, Math.sin(a) * R);
        grd.addColorStop(0, rgba(C.energie, 0)); grd.addColorStop(1, rgba(C.energie, 0.35));
        ctx.fillStyle = grd; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R * 0.8, a - 0.5, a); ctx.closePath(); ctx.fill();
        if (!this.dernierPing || now - this.dernierPing > 900) { this.pings.push(now); this.dernierPing = now; }
        this.pings = this.pings.filter((p0) => now - p0 < 1800);
        this.pings.forEach((p0) => { const k = (now - p0) / 1800; ctx.strokeStyle = rgba(C.neon, 0.6 * (1 - k)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, R * 0.2 + k * R * 0.6, 0, Math.PI * 2); ctx.stroke(); });
        ctx.restore();
      }
    }

    /* icosaèdre holographique */
    const ri = R * (mini ? 0.46 : 0.36) * (1 + niveau * 0.08);
    const ay = this.angle * 0.55, ax = this.angle * 0.32 + 0.5;
    const cyA = Math.cos(ay), syA = Math.sin(ay), cxA = Math.cos(ax), sxA = Math.sin(ax);
    const P = V.map(([x, y, z]) => {
      let X = x * cyA + z * syA, Z = -x * syA + z * cyA;
      let Y = y * cxA - Z * sxA; Z = y * sxA + Z * cxA;
      const k = 2.6 / (2.6 + Z);
      return [cx + X * ri * k, cy + Y * ri * k, Z];
    });
    ctx.lineWidth = mini ? 0.9 : 1.15;
    A.forEach(([i, j]) => {
      const prof = (P[i][2] + P[j][2]) / 2;
      ctx.strokeStyle = rgba(prof > 0 ? coul : coul2, prof > 0 ? 0.28 : 0.85);
      ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); ctx.stroke();
    });
    if (!mini) {
      P.forEach(([x, y, z]) => { ctx.fillStyle = rgba(C.energie, z > 0 ? 0.35 : 0.95); ctx.beginPath(); ctx.arc(x, y, z > 0 ? 1.4 : 2.2, 0, Math.PI * 2); ctx.fill(); });
    }
    /* cœur lumineux */
    ctx.fillStyle = rgba(etat === "erreur" || etat === "horsligne" ? coul : C.texte, 0.9);
    ctx.shadowColor = coul; ctx.shadowBlur = mini ? 6 : 18;
    ctx.beginPath(); ctx.arc(cx, cy, (mini ? 1.6 : 3.2) * (1 + niveau * 0.6), 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  };

  let raf = 0, derniere = 0;
  function boucle() {
    if (raf) return;
    raf = requestAnimationFrame(function f(now) {
      raf = 0;
      if (!C) C = couleurs();
      const dt = derniere ? Math.min(0.05, (now - derniere) / 1000) : 0.016; derniere = now;
      niveau += (niveauCible - niveau) * 0.2; niveauCible *= 0.92;
      let actif = false;
      instances.forEach((i) => { if (i.visible && i.c.isConnected) { i.dessiner(now, dt); actif = true; } });
      if (actif && !document.hidden && !calme()) raf = requestAnimationFrame(f); else derniere = 0;
    });
  }
  function redessiner() { C = couleurs(); derniere = 0; if (raf) { cancelAnimationFrame(raf); raf = 0; } boucle(); }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) boucle(); });
  addEventListener("resize", () => { instances.forEach((i) => i.taille()); redessiner(); });
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", redessiner);

  window.NovaCoeur = {
    ETATS,
    monter(canvas, opts) { const i = new Instance(canvas, opts); instances.add(i); redessiner(); return i; },
    demonter(canvas) { instances.forEach((i) => { if (i.c === canvas) { if (i.io) i.io.disconnect(); instances.delete(i); } }); },
    /* change l'état ; phrase facultative (sinon celle par défaut) */
    etat(nom, texte) {
      if (!ETATS[nom]) return;
      const change = nom !== etat;
      etat = nom; phrase = texte || ETATS[nom].phrase; if (change) depuis = performance.now();
      document.documentElement.dataset.noyau = nom;
      ecouteurs.forEach((f) => { try { f(etat, phrase); } catch (e) {} });
      redessiner();
    },
    actuel: () => ({ etat, phrase, nom: ETATS[etat].nom, depuis }),
    niveau(x) { niveauCible = Math.max(niveauCible, Math.min(1, x || 0)); boucle(); },
    ecouter(f) { ecouteurs.add(f); return () => ecouteurs.delete(f); },
    rafraichir: redessiner,
  };
})();
