/* N.O.V.A — auto-évolution réelle, tant que l'appli est ouverte.
   OBSERVER → IDENTIFIER → APPRENDRE → ANALYSER → AMÉLIORER → TESTER → VALIDER → MÉMORISER → RECOMMENCER.
   Ce qu'elle change seule : des réglages réversibles (ordre des cerveaux, température, rangement des outils, ménage).
   Chaque changement garde l'ancienne valeur, est mesuré, puis gardé ou annulé tout seul.
   Ce qui touche ses données, ses notifications, ses rituels ou le cerveau en ligne : proposé, jamais fait sans son accord.
   Le code lui-même ne change que par une mise à jour qu'il accepte (ORACLE prépare, Joka valide). */
(function () {
  "use strict";
  const S = window.NovaStore;
  const ETAPES = ["Observer", "Identifier", "Apprendre", "Analyser", "Améliorer", "Tester", "Valider", "Mémoriser"];
  const NIVEAUX = { auto: "Automatique", surveille: "Surveillé", validation: "Validation obligatoire" };
  /* catégories de changements et niveau par défaut ; « donnees » et « cerveau » restent toujours en validation */
  const PERMISSIONS_DEFAUT = { cerveau_ordre: "surveille", cerveau_reglages: "auto", interface: "auto", menage: "auto", rituels: "validation", notifications: "validation", donnees: "validation", cerveau: "validation" };
  const VERROUILLEES = ["donnees", "cerveau"];
  const LIBELLES = { cerveau_ordre: "Ordre des cerveaux en ligne", cerveau_reglages: "Réglages du cerveau (température)", interface: "Rangement de l'interface", menage: "Ménage (journal, file d'attente)", rituels: "Heures des rituels", notifications: "Notifications", donnees: "Tes données (effacer, remplacer)", cerveau: "Envoyer au cerveau en ligne" };

  let etape = -1, enCours = false, minuterie = null;
  const ecouteurs = new Set();
  const signaler = () => ecouteurs.forEach((f) => { try { f(etape); } catch (e) {} });

  async function etat() {
    return Object.assign({ cycles: 0, dernier: 0, historique: [], apprentissages: [], propositions: [], tests: [] }, (await S.kvLire("evolution")) || {});
  }
  async function sauver(E) {
    E.historique = E.historique.slice(-80); E.apprentissages = E.apprentissages.slice(-40);
    E.propositions = E.propositions.slice(-20); await S.kvMettre("evolution", E);
    window.dispatchEvent(new CustomEvent("nova:evolution"));
  }
  async function permissions() { const p = Object.assign({}, PERMISSIONS_DEFAUT, (await S.kvLire("permissions")) || {}); VERROUILLEES.forEach((k) => (p[k] = "validation")); return p; }
  async function reglerPermission(k, niveau) {
    if (VERROUILLEES.includes(k) || !NIVEAUX[niveau]) return false;
    const p = await permissions(); p[k] = niveau; await S.kvMettre("permissions", p);
    if (window.NovaJournal) NovaJournal.ajouter("securite", `Permission « ${LIBELLES[k]} » : ${NIVEAUX[niveau]}`);
    return true;
  }
  function apprendre(E, texte) { if (!E.apprentissages.some((a) => a.texte === texte)) E.apprentissages.push({ at: Date.now(), texte }); }
  function taux(rec) { if (!rec || !rec.length) return null; return rec.filter((r) => r.ok).length / rec.length; }
  function latence(rec) { const ok = (rec || []).filter((r) => r.ok && r.ms); return ok.length ? Math.round(ok.reduce((s, r) => s + r.ms, 0) / ok.length) : null; }

  /* ---------- OBSERVER : uniquement des mesures réelles de l'appli ---------- */
  async function observer() {
    const stats = (await S.kvLire("stats_cerveau")) || {};
    const cfg = window.NovaCerveau ? await NovaCerveau.config() : { ordre: [], cles: {} };
    const journal = window.NovaJournal ? await NovaJournal.derniers(60) : [];
    const reveils = journal.filter((j) => j.type === "reveil" || j.type === "erreur");
    const file = (await S.kvLire("file_attente")) || [];
    const exp = await S.kvLire("export_dernier"); const imp = await S.kvLire("import_dernier");
    const sto = await S.stockage();
    const ntfy = window.NovaNtfy ? await NovaNtfy.config() : {};
    const usage = (await S.kvLire("usage")) || {};
    const erreursJS = (await S.kvLire("erreurs_js")) || [];
    return { stats, cfg, reveils, file, exp, imp, sto, ntfy, usage, erreursJS, enLigne: navigator.onLine };
  }

  /* ---------- IDENTIFIER + ANALYSER : constats → pistes, avec leur niveau ---------- */
  function identifier(O, E, P) {
    const pistes = [];
    const actifs = O.cfg.ordre.filter((f) => O.cfg.cles[f]);
    /* 1. le premier cerveau échoue ou traîne alors qu'un autre fait mieux */
    if (actifs.length >= 2) {
      const mes = actifs.map((f) => { const r = ((O.stats[f] || {}).recents || []).slice(-10); return { f, n: r.length, taux: taux(r), ms: latence(r) }; });
      const premier = mes[0], meilleur = mes.slice(1).filter((m) => m.n >= 3).sort((a, b) => (b.taux - a.taux) || ((a.ms || 9e9) - (b.ms || 9e9)))[0];
      if (premier.n >= 3 && meilleur && (premier.taux < 0.7 && meilleur.taux > premier.taux + 0.2 || (premier.taux >= 0.9 && meilleur.taux >= 0.9 && premier.ms && meilleur.ms && meilleur.ms < premier.ms / 2))) {
        const nouvel = [meilleur.f].concat(O.cfg.ordre.filter((f) => f !== meilleur.f));
        pistes.push({ cle: "cerveau_ordre:" + nouvel.join(","), cat: "cerveau_ordre", titre: `Passer ${window.NovaCerveau.FOURNISSEURS[meilleur.f].nom} en premier`,
          detail: `${premier.f} : ${Math.round(premier.taux * 100)} % de réussite, ${premier.ms || "?"} ms · ${meilleur.f} : ${Math.round(meilleur.taux * 100)} %, ${meilleur.ms || "?"} ms (10 derniers appels).`,
          avant: O.cfg.ordre, apres: nouvel, mesure: "cerveau" });
      }
    }
    /* 2. réponses du cerveau mal formées → baisser la température */
    const malformes = O.reveils.slice(0, 10).filter((j) => j.type === "erreur" && /JSON|sans JSON|réponse vide/.test(j.texte)).length;
    if (malformes >= 2 && (O.cfg.temperature || 0.6) > 0.3) {
      const t = Math.max(0.3, Math.round(((O.cfg.temperature || 0.6) - 0.2) * 10) / 10);
      pistes.push({ cle: "temp:" + t, cat: "cerveau_reglages", titre: `Rendre le cerveau plus rigoureux (température ${t})`, detail: `${malformes} réponses mal formées sur les 10 derniers réveils.`, avant: O.cfg.temperature || 0.6, apres: t, mesure: "reveils" });
    }
    /* 3. des demandes coincées alors que tout marche */
    if (O.file.length && O.enLigne && actifs.length && O.cfg.autorise && O.file.some((x) => Date.now() - x.at > 15 * 60000))
      pistes.push({ cle: "file", cat: "menage", titre: `Reprendre ${O.file.length} demande(s) en attente`, detail: "Elles attendent depuis plus de 15 min alors que le cerveau est disponible.", action: "rejouer" });
    /* 4. stockage pas protégé */
    if (O.sto && !O.sto.persiste) pistes.push({ cle: "persist", cat: "menage", titre: "Protéger tes données contre le nettoyage d'iOS", detail: "Le stockage n'est pas encore marqué « persistant ».", action: "persister" });
    /* 5. outils rangés par usage réel */
    const ordreUsage = Object.entries(O.usage).filter(([k]) => k.startsWith("module:")).sort((a, b) => (b[1].n || 0) - (a[1].n || 0)).map(([k]) => k.slice(7));
    const actuel = (E.reglages && E.reglages.ordreOutils) || [];
    if (ordreUsage.length >= 3 && ordreUsage.slice(0, 4).join() !== actuel.slice(0, 4).join())
      pistes.push({ cle: "outils:" + ordreUsage.slice(0, 4).join(), cat: "interface", titre: "Mettre tes outils les plus utilisés en premier", detail: "D'après ce que tu ouvres vraiment : " + ordreUsage.slice(0, 4).join(", ") + ".", avant: actuel, apres: ordreUsage, mesure: "aucune" });
    /* 6. sauvegarde trop vieille → proposition */
    const derniereSauvegarde = Math.max((O.exp && O.exp.at) || 0, 0);
    if (Date.now() - derniereSauvegarde > 7 * 864e5 && (O.imp || derniereSauvegarde))
      pistes.push({ cle: "sauvegarde:" + Math.floor(Date.now() / (7 * 864e5)), cat: "donnees", titre: "Faire une sauvegarde de tes données", detail: derniereSauvegarde ? "Dernière sauvegarde il y a " + Math.floor((Date.now() - derniereSauvegarde) / 864e5) + " jours." : "Aucune sauvegarde faite depuis l'appli.", action: "sauvegarder" });
    /* 7. notifications pas branchées → proposition */
    if (!O.ntfy.actif) pistes.push({ cle: "ntfy", cat: "notifications", titre: "Activer les rappels (check-in, bilan) par ntfy", detail: "Sans ça, je ne peux pas te prévenir quand l'appli est fermée.", action: "ntfy" });
    /* 8. erreurs du code qui reviennent → je l'apprends, ORACLE corrige dans une mise à jour */
    const comptes = {}; O.erreursJS.forEach((e) => { comptes[e.message] = (comptes[e.message] || 0) + 1; });
    Object.entries(comptes).filter(([, n]) => n >= 2).forEach(([m, n]) => apprendre(E, `Erreur du code vue ${n} fois : « ${m.slice(0, 90)} » — à corriger dans une mise à jour.`));
    return pistes.map((p) => Object.assign(p, { niveau: P[p.cat] || "validation" }));
  }

  /* ---------- AMÉLIORER : appliquer un changement (réversible) ---------- */
  async function appliquer(p, E) {
    if (p.cat === "cerveau_ordre") await NovaCerveau.regler({ ordre: p.apres });
    else if (p.cat === "cerveau_reglages") await NovaCerveau.regler({ temperature: p.apres });
    else if (p.cat === "interface") { E.reglages = Object.assign({}, E.reglages, { ordreOutils: p.apres }); }
    else if (p.action === "rejouer") await NovaAgent.rejouer();
    else if (p.action === "persister") await S.demanderPersistance();
    else if (p.action === "sauvegarder") await NovaSauvegarde.exporter();
    else if (p.action === "ntfy") { await NovaNtfy.regler({ actif: true }); await NovaAgent.planifierRituels(); }
    else return false;
    return true;
  }
  async function annulerChangement(h, E) {
    if (h.cat === "cerveau_ordre") await NovaCerveau.regler({ ordre: h.avant });
    else if (h.cat === "cerveau_reglages") await NovaCerveau.regler({ temperature: h.avant });
    else if (h.cat === "interface") E.reglages = Object.assign({}, E.reglages, { ordreOutils: h.avant });
    else return false;
    return true;
  }
  function mesureActuelle(type, O) {
    if (type === "cerveau") { const all = Object.values(O.stats).flatMap((x) => x.recents || []).sort((a, b) => a.at - b.at).slice(-10); return { taux: taux(all), ms: latence(all), n: all.length, jusqua: all.length ? all[all.length - 1].at : 0 }; }
    if (type === "reveils") { const r = O.reveils.slice(0, 10); return { taux: r.length ? r.filter((j) => j.type === "reveil").length / r.length : null, n: r.length }; }
    return null;
  }

  /* ---------- un cycle complet ---------- */
  async function cycle(manuel) {
    if (enCours) return null; enCours = true;
    const pas = async (i) => { etape = i; signaler(); await new Promise((r) => setTimeout(r, manuel ? 380 : 60)); };
    const bilan = { appliques: 0, valides: 0, annules: 0, proposes: 0 };
    try {
      const E = await etat(), P = await permissions();
      await pas(0); const O = await observer();
      await pas(1); const pistes = identifier(O, E, P);
      await pas(2);
      if (O.imp && !E.apprentissages.some((a) => /importées/.test(a.texte))) apprendre(E, `Tes données ont été importées (${O.imp.ecrits} éléments, ${O.imp.fichiers} fichiers).`);
      Object.entries(O.stats).forEach(([f, x]) => { if ((x.recents || []).length >= 5) apprendre(E, `${window.NovaCerveau.FOURNISSEURS[f] ? NovaCerveau.FOURNISSEURS[f].nom : f} : ${Math.round(taux(x.recents) * 100)} % de réussite, ${latence(x.recents) || "?"} ms en moyenne sur ses derniers appels.`); });
      await pas(3);
      const deja = new Set(E.historique.filter((h) => Date.now() - h.at < 3 * 864e5).map((h) => h.cle).concat(E.propositions.map((x) => x.cle)));
      const nouvelles = pistes.filter((p) => !deja.has(p.cle));
      await pas(4);
      for (const p of nouvelles) {
        if (p.niveau === "validation") { E.propositions.push(Object.assign({ at: Date.now(), statut: "propose" }, p)); bilan.proposes++; continue; }
        const ok = await appliquer(p, E).catch(() => false);
        if (!ok) continue;
        const h = Object.assign({ at: Date.now(), statut: p.mesure && p.mesure !== "aucune" && p.niveau === "surveille" ? "en test" : "appliqué", mesureAvant: mesureActuelle(p.mesure, O) }, p);
        E.historique.push(h); bilan.appliques++;
        if (window.NovaJournal) NovaJournal.ajouter("evolution", `${NIVEAUX[p.niveau]} : ${p.titre}`);
      }
      await pas(5);
      /* TESTER / VALIDER : les changements en test depuis assez d'appels */
      const O2 = await observer();
      for (const h of E.historique.filter((x) => x.statut === "en test")) {
        const apres = mesureActuelle(h.mesure, O2);
        const avant = h.mesureAvant || {};
        const nouveaux = h.mesure === "cerveau" ? Object.values(O2.stats).flatMap((x) => x.recents || []).filter((r) => r.at > h.at).length : apres ? apres.n : 0;
        if (nouveaux < 5) { if (Date.now() - h.at > 7 * 864e5) { h.statut = "validé"; h.verdict = "pas assez d'usage pour mesurer en 7 jours : gardé"; } continue; }
        await pas(6);
        const mieux = apres && avant.taux != null && apres.taux != null ? apres.taux >= avant.taux - 0.05 : true;
        if (mieux) { h.statut = "validé"; h.mesureApres = apres; h.verdict = `gardé : ${Math.round((apres.taux || 0) * 100)} % de réussite après (${Math.round((avant.taux || 0) * 100)} % avant)`; bilan.valides++; }
        else { await annulerChangement(h, E); h.statut = "annulé"; h.mesureApres = apres; h.verdict = `annulé tout seul : ${Math.round(apres.taux * 100)} % après contre ${Math.round(avant.taux * 100)} % avant`; bilan.annules++; }
        if (window.NovaJournal) NovaJournal.ajouter("evolution", `${h.titre} — ${h.verdict}`);
      }
      await pas(7);
      E.cycles++; E.dernier = Date.now(); E.dernierBilan = bilan;
      await sauver(E);
      return bilan;
    } finally { enCours = false; etape = -1; signaler(); }
  }

  async function decider(cle, accepte) {
    const E = await etat(); const p = E.propositions.find((x) => x.cle === cle); if (!p) return false;
    E.propositions = E.propositions.filter((x) => x.cle !== cle);
    if (accepte) {
      const ok = await appliquer(p, E).catch((e) => { p.erreur = e.message; return false; });
      E.historique.push(Object.assign({}, p, { at: Date.now(), statut: ok ? "validé" : "échec", verdict: ok ? "accepté par Joka" : "n'a pas pu être fait : " + (p.erreur || "?") }));
    } else E.historique.push(Object.assign({}, p, { at: Date.now(), statut: "refusé", verdict: "refusé par Joka" }));
    await sauver(E);
    if (window.NovaJournal) NovaJournal.ajouter("evolution", (accepte ? "Accepté : " : "Refusé : ") + p.titre);
    return true;
  }
  async function annuler(at) {
    const E = await etat(); const h = E.historique.find((x) => x.at === at); if (!h) return false;
    const ok = await annulerChangement(h, E); if (!ok) return false;
    h.statut = "annulé"; h.verdict = "annulé par Joka"; await sauver(E);
    if (window.NovaJournal) NovaJournal.ajouter("evolution", "Annulé par Joka : " + h.titre);
    return true;
  }

  /* erreurs du code : on les garde pour les apprendre (rien n'est envoyé) */
  async function noterErreur(message, ou) {
    try { const l = (await S.kvLire("erreurs_js")) || []; l.push({ message: String(message || "").slice(0, 200), ou: String(ou || "").slice(0, 120), at: Date.now() }); await S.kvMettre("erreurs_js", l.slice(-30)); } catch (e) {}
  }
  addEventListener("error", (e) => noterErreur(e.message, (e.filename || "").split("/").pop() + ":" + e.lineno));
  addEventListener("unhandledrejection", (e) => noterErreur(e.reason && (e.reason.message || e.reason), "promesse"));

  window.NovaEvolution = {
    ETAPES, NIVEAUX, LIBELLES, VERROUILLEES,
    etat, permissions, reglerPermission, cycle, decider, annuler,
    etape: () => etape, enCours: () => enCours,
    ecouter(f) { ecouteurs.add(f); return () => ecouteurs.delete(f); },
    async usage(cle) { const u = (await S.kvLire("usage")) || {}; const x = u[cle] || { n: 0 }; x.n++; x.at = Date.now(); u[cle] = x; await S.kvMettre("usage", u); },
    demarrer() {
      setTimeout(() => cycle(false), 20000);
      minuterie = setInterval(() => { if (!document.hidden) cycle(false); }, 30 * 60000);
    },
  };
})();
