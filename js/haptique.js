/* N.O.V.A — retours haptiques (petites vibrations).
   iPhone (Safari 18 ou plus) : pas de navigator.vibrate ; on passe par un interrupteur caché (<input switch>)
   dont le basculement fait vibrer le téléphone. Ça ne marche qu'après un toucher de Joka (règle d'iOS).
   Android et autres : navigator.vibrate. Réglable dans Outils → Réglages de l'appli → Affichage. */
(function () {
  "use strict";
  let actif = true, label = null;
  function prep() {
    if (label || !document.body) return label;
    label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.style.cssText = "position:fixed;left:-20px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
    const i = document.createElement("input"); i.type = "checkbox"; i.setAttribute("switch", ""); i.tabIndex = -1;
    label.appendChild(i); document.body.appendChild(label);
    return label;
  }
  function vibrer(motif) {
    if (!actif) return false;
    try {
      if (navigator.vibrate) return navigator.vibrate(motif);
      const l = prep(); if (!l) return false;
      l.click(); if (Array.isArray(motif) && motif.length > 2) setTimeout(() => l.click(), 90);
      return true;
    } catch (e) { return false; }
  }
  window.NovaHaptique = {
    tap: () => vibrer(8),
    succes: () => vibrer([8, 60, 8]),
    erreur: () => vibrer([20, 50, 20]),
    get actif() { return actif; },
    async regler(v) { actif = !!v; try { await window.NovaStore.kvMettre("haptique", { actif }); } catch (e) {} },
    async charger() { try { const v = await window.NovaStore.kvLire("haptique"); if (v && v.actif === false) actif = false; } catch (e) {} },
  };
  window.NovaHaptique.charger();
})();
