/* Pages publiques du module d'inscription : presentation, conditions, suivi.
   Tout contenu dynamique est insere avec textContent (jamais innerHTML). */
(function () {
  var page = (document.querySelector("[data-page]") || {}).dataset;
  page = page ? page.page : "";

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
    } catch (e) {
      return iso;
    }
  }
  function getConfig() {
    return fetch("/api/registration/config").then(function (r) {
      if (!r.ok) throw new Error("config");
      return r.json();
    });
  }

  // Bandeau d'etat + bouton "Deposer" : pilotes uniquement par le serveur.
  function applyPhase(cfg) {
    var banner = document.getElementById("reg-banner");
    var btn = document.getElementById("btn-apply");
    if (banner) {
      banner.hidden = false;
      banner.className = "reg-banner" + (cfg.phase === "open" ? " open" : "");
      banner.textContent = "";
      var strong = el("strong", null, cfg.phase === "open" ? "Inscriptions ouvertes" : "Inscriptions fermées");
      banner.appendChild(strong);
      banner.appendChild(document.createTextNode(cfg.message));
      if (cfg.phase === "open" && cfg.ends_at) {
        banner.appendChild(el("div", "reg-muted", "Clôture : " + fmtDate(cfg.ends_at)));
      }
    }
    if (btn && cfg.phase !== "open") {
      btn.setAttribute("aria-disabled", "true");
      btn.removeAttribute("href");
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        if (banner) banner.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }

  function initHome() {
    getConfig().then(applyPhase).catch(function () {
      var btn = document.getElementById("btn-apply");
      if (btn) btn.setAttribute("aria-disabled", "true");
    });
  }

  function addSection(root, title, value, pre) {
    root.appendChild(el("h3", null, title));
    root.appendChild(el("p", pre ? "reg-pre" : "", value));
  }

  function initConditions() {
    var root = document.getElementById("cond-root");
    getConfig().then(function (c) {
      applyPhase(c);
      root.textContent = "";
      var NOT_SET = "Non encore défini par l'organisation.";
      root.appendChild(el("h2", null, "Informations officielles"));

      var dl = el("dl", "reg-dl");
      function row(k, v) {
        dl.appendChild(el("dt", null, k));
        dl.appendChild(el("dd", null, v));
      }
      row("Période d'inscription", c.starts_at || c.ends_at
        ? (c.starts_at ? "Du " + fmtDate(c.starts_at) : "Ouverture à définir") + (c.ends_at ? " au " + fmtDate(c.ends_at) : "")
        : NOT_SET);
      row("Âge minimum", c.min_age != null ? c.min_age + " ans" : NOT_SET);
      row("Âge maximum", c.max_age != null ? c.max_age + " ans" : NOT_SET);
      row("Filières autorisées", c.allowed_fields.length ? c.allowed_fields.join(", ") : NOT_SET);
      row("Niveaux autorisés", c.allowed_levels.length ? c.allowed_levels.join(", ") : NOT_SET);
      var docs = [];
      Object.keys(c.documents).forEach(function (k) {
        if (c.documents[k] === "off") return;
        docs.push(c.document_labels[k] + (c.documents[k] === "required" ? " (obligatoire)" : " (facultatif)"));
      });
      row("Pièces demandées", docs.join(" · ") + " — formats JPG, JPEG ou PNG, " + c.max_file_mb + " Mo maximum");
      root.appendChild(dl);

      if (c.special_conditions) addSection(root, "Conditions particulières", c.special_conditions, true);
      addSection(root, "Règlement du concours", c.rules_text || "Le règlement officiel n'a pas encore été publié par l'organisation.", true);
      addSection(root, "Politique de confidentialité", c.privacy_text || "La politique de confidentialité n'a pas encore été publiée par l'organisation.", true);
    }).catch(function () {
      root.textContent = "Impossible de charger les conditions pour le moment. Réessaie plus tard.";
    });
  }

  function initTrack() {
    var ref = document.getElementById("t-ref");
    var code = document.getElementById("t-code");
    var btn = document.getElementById("t-btn");
    var alertBox = document.getElementById("t-alert");
    var result = document.getElementById("t-result");

    function showErr(msg) {
      alertBox.textContent = msg;
      alertBox.className = "reg-alert show";
    }
    function go() {
      alertBox.className = "reg-alert";
      result.hidden = true;
      if (!ref.value.trim() || !code.value.trim()) return showErr("Renseigne ta référence et ton code de suivi.");
      btn.disabled = true;
      btn.textContent = "Vérification…";
      fetch("/api/registration/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: ref.value, code: code.value }),
      })
        .then(function (r) {
          return r.json().then(function (b) { return { ok: r.ok, body: b }; });
        })
        .then(function (r) {
          if (!r.ok) return showErr(r.body.error || "Consultation impossible.");
          render(r.body);
        })
        .catch(function () { showErr("Connexion impossible. Réessaie."); })
        .then(function () {
          btn.disabled = false;
          btn.textContent = "Consulter mon dossier";
        });
    }
    function render(d) {
      result.textContent = "";
      result.hidden = false;
      result.appendChild(el("p", "reg-eyebrow", d.reference));
      result.appendChild(el("h2", null, d.name));
      result.appendChild(el("span", "reg-status" + (d.status === "incomplete" ? " incomplete" : ""), d.status_label));
      result.appendChild(el("p", null, d.status_info));
      if (d.message) {
        result.appendChild(el("h3", null, "Message de l'organisation"));
        result.appendChild(el("p", "reg-pre", d.message));
      }
      var dl = el("dl", "reg-dl");
      dl.appendChild(el("dt", null, "Catégorie"));
      dl.appendChild(el("dd", null, d.category));
      dl.appendChild(el("dt", null, "Déposée le"));
      dl.appendChild(el("dd", null, fmtDate(d.submitted_at)));
      dl.appendChild(el("dt", null, "Dernière mise à jour"));
      dl.appendChild(el("dd", null, fmtDate(d.updated_at)));
      result.appendChild(dl);
      result.appendChild(el("h3", null, "Historique"));
      var ul = el("ul", "reg-timeline");
      d.timeline.forEach(function (t) {
        var li = el("li", null, t.label);
        li.appendChild(el("small", null, fmtDate(t.at)));
        ul.appendChild(li);
      });
      result.appendChild(ul);
      result.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    btn.addEventListener("click", go);
    [ref, code].forEach(function (i) {
      i.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    });
  }

  if (page === "home") initHome();
  if (page === "conditions") initConditions();
  if (page === "track") initTrack();
})();
