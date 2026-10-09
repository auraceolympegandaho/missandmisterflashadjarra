/* Admin — Gestion des candidatures. S'appuie sur apiFetch de admin.js (charge avant). Contenu dynamique : textContent uniquement. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function fmt(iso) { try { return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }); } catch (e) { return iso || ""; } }
  var DOC_LABELS = { photo: "Photo", student_card: "Carte d'étudiant", id_document: "Pièce d'identité" };
  var ANSWER_LABELS = {
    q1_presentation: "Présentation", q2_motivation: "Motivation", q3_qualities: "Qualités",
    q4_talents: "Talents", q5_leadership: "Vision du leadership", q6_contribution: "Apport à la FLASH Adjarra",
  };
  var CONSENT_LABELS = { info_accuracy: "Exactitude des informations", rules_read: "Règlement lu", conditions_accepted: "Conditions acceptées", privacy_read: "Confidentialité lue", photo_consent: "Consentement photographies" };
  function adminToken() { return localStorage.getItem("admin_token") || ""; }
  var state = { page: 1, limit: 25, statuses: {}, loaded: false, blobUrls: [] };

  var tabBtn = document.querySelector('[data-tab="registrations"]');
  tabBtn.addEventListener("click", function () {
    if (!state.loaded) { state.loaded = true; loadSettings(); }
    loadStats(); loadList();
  });

  // ---------- Stats ----------
  function loadStats() {
    apiFetch("/registrations/stats").then(function (s) {
      var box = $("rg-stats"); box.textContent = "";
      [["Total", s.total], ["MISS", s.miss], ["MISTER", s.mister], ["En attente", s.pending], ["Incomplets", s.incomplete], ["Validés", s.validated], ["Présélection", s.shortlisted]]
        .forEach(function (x) { var c = el("div", "rg-stat"); c.appendChild(el("b", null, String(x[1]))); c.appendChild(el("span", null, x[0])); box.appendChild(c); });
    }).catch(function () {});
  }

  // ---------- Parametres ----------
  function toLocalInput(iso) {
    if (!iso) return "";
    var d = new Date(iso); if (isNaN(d)) return "";
    var p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function fromLocalInput(v) { return v ? new Date(v).toISOString() : ""; }
  var PHASE_TXT = { open: "OUVERTES", not_open: "pas encore ouvertes", ended: "terminées", closed: "fermées" };
  function showSettings(data) {
    var s = data.settings;
    $("rg-open").checked = !!s.open;
    $("rg-starts").value = toLocalInput(s.starts_at);
    $("rg-ends").value = toLocalInput(s.ends_at);
    $("rg-minage").value = s.min_age == null ? "" : s.min_age;
    $("rg-maxage").value = s.max_age == null ? "" : s.max_age;
    $("rg-edition").value = s.edition;
    $("rg-closedmsg").value = s.closed_message;
    $("rg-fields").value = s.allowed_fields.join("\n");
    $("rg-levels").value = s.allowed_levels.join("\n");
    $("rg-doc-student_card").value = s.documents.student_card;
    $("rg-doc-id_document").value = s.documents.id_document;
    $("rg-special").value = s.special_conditions;
    $("rg-rules").value = s.rules_text;
    $("rg-privacy").value = s.privacy_text;
    $("rg-phase").textContent = "État actuel pour le public : inscriptions " + (PHASE_TXT[data.phase.phase] || data.phase.phase) + ". Message affiché : « " + data.phase.message + " »";
    var w = $("rg-warnings"); w.textContent = "";
    (data.warnings || []).forEach(function (t) { w.appendChild(el("li", null, t)); });
  }
  function loadSettings() { apiFetch("/registrations/settings").then(showSettings).catch(function (e) { $("rg-settings-msg").textContent = e.message; }); }
  function lines(v) { return v.split("\n").map(function (x) { return x.trim(); }).filter(Boolean); }
  $("rg-save-settings").addEventListener("click", function () {
    var msg = $("rg-settings-msg"); msg.style.color = ""; msg.textContent = "";
    apiFetch("/registrations/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        open: $("rg-open").checked, starts_at: fromLocalInput($("rg-starts").value), ends_at: fromLocalInput($("rg-ends").value),
        closed_message: $("rg-closedmsg").value, edition: $("rg-edition").value,
        min_age: $("rg-minage").value, max_age: $("rg-maxage").value,
        allowed_fields: lines($("rg-fields").value), allowed_levels: lines($("rg-levels").value),
        documents: { student_card: $("rg-doc-student_card").value, id_document: $("rg-doc-id_document").value },
        special_conditions: $("rg-special").value, rules_text: $("rg-rules").value, privacy_text: $("rg-privacy").value,
      }),
    }).then(function (d) { showSettings(d); msg.style.color = "green"; msg.textContent = "Paramètres enregistrés."; })
      .catch(function (e) { msg.textContent = e.message; });
  });

  // ---------- Liste ----------
  function qs(extra) {
    var p = new URLSearchParams();
    var map = { q: "rg-q", category: "rg-cat", status: "rg-status", field: "rg-field", complete: "rg-complete" };
    Object.keys(map).forEach(function (k) { var v = $(map[k]).value.trim(); if (v) p.set(k, v); });
    Object.keys(extra || {}).forEach(function (k) { p.set(k, extra[k]); });
    return p.toString();
  }
  function fillSelect(sel, items, current) {
    var first = sel.options[0];
    sel.textContent = ""; sel.appendChild(first);
    items.forEach(function (it) { var o = el("option", null, it[1]); o.value = it[0]; sel.appendChild(o); });
    sel.value = current;
  }
  function loadList() {
    apiFetch("/registrations?" + qs({ page: state.page, limit: state.limit })).then(function (d) {
      state.statuses = d.statuses;
      if ($("rg-status").options.length <= 1) fillSelect($("rg-status"), Object.keys(d.statuses).map(function (k) { return [k, d.statuses[k]]; }), "");
      fillSelect($("rg-field"), d.fields.map(function (f) { return [f, f]; }), $("rg-field").value);
      var tb = document.querySelector("#rg-table tbody"); tb.textContent = "";
      if (!d.rows.length) { var tr = el("tr"); var td = el("td", null, "Aucune candidature."); td.colSpan = 7; tr.appendChild(td); tb.appendChild(tr); }
      d.rows.forEach(function (r) {
        var tr = el("tr");
        [r.reference, r.last_name + " " + r.first_names, r.category, r.field_of_study + " — " + r.study_level].forEach(function (t) { tr.appendChild(el("td", null, t)); });
        var td = el("td"); td.appendChild(el("span", "rg-badge " + r.status, d.statuses[r.status] || r.status));
        if (r.is_complete) td.appendChild(el("span", "rg-badge validated", "complet"));
        tr.appendChild(td);
        tr.appendChild(el("td", null, fmt(r.created_at)));
        var act = el("td"); var b = el("button", "btn", "Ouvrir"); b.type = "button"; b.addEventListener("click", function () { openDetail(r.id); }); act.appendChild(b);
        tr.appendChild(act); tb.appendChild(tr);
      });
      var pages = Math.max(1, Math.ceil(d.total / d.limit));
      $("rg-page").textContent = "Page " + d.page + " / " + pages + " — " + d.total + " candidature(s)";
      $("rg-prev").disabled = d.page <= 1; $("rg-next").disabled = d.page >= pages;
    }).catch(function (e) { console.error(e); });
  }
  var timer;
  ["rg-cat", "rg-status", "rg-field", "rg-complete"].forEach(function (id) { $(id).addEventListener("change", function () { state.page = 1; loadList(); }); });
  $("rg-q").addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(function () { state.page = 1; loadList(); }, 350); });
  $("rg-prev").addEventListener("click", function () { state.page--; loadList(); });
  $("rg-next").addEventListener("click", function () { state.page++; loadList(); });

  // ---------- Export CSV (avec jeton : pas d'URL publique) ----------
  function exportCsv(contacts) {
    fetch("/api/admin/registrations/export.csv?" + qs(contacts ? { contacts: "1" } : {}), { headers: { Authorization: "Bearer " + adminToken() } })
      .then(function (r) { if (!r.ok) throw new Error("Export impossible."); return r.blob(); })
      .then(function (b) { var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "candidatures-mmfa.csv"; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000); })
      .catch(function (e) { alert(e.message); });
  }
  $("rg-export").addEventListener("click", function () { exportCsv(false); });
  $("rg-export-contacts").addEventListener("click", function () {
    if (confirm("Cet export contient des données personnelles (téléphone, WhatsApp, email). Continuer ?")) exportCsv(true);
  });

  // ---------- Detail ----------
  function openDetail(id) {
    apiFetch("/registrations/" + id).then(function (d) { renderDetail(d); $("rg-detail").scrollIntoView({ behavior: "smooth" }); })
      .catch(function (e) { alert(e.message); });
  }
  function kv(dl, k, v) { dl.appendChild(el("dt", null, k)); dl.appendChild(el("dd", null, v || "—")); }

  function renderDetail(d) {
    state.blobUrls.forEach(function (u) { URL.revokeObjectURL(u); }); state.blobUrls = [];
    var a = d.application, root = $("rg-detail"); root.hidden = false; root.textContent = "";
    var close = el("button", "btn", "Fermer"); close.type = "button"; close.style.float = "right"; close.addEventListener("click", function () { root.hidden = true; });
    root.appendChild(close);
    root.appendChild(el("h2", null, a.last_name + " " + a.first_names));
    root.appendChild(el("p", null, a.reference + " · " + a.category + " · soumise le " + fmt(a.created_at)));

    root.appendChild(el("h3", null, "Identité et contact"));
    var dl = el("dl", "rg-kv");
    kv(dl, "Date de naissance", a.birth_date); kv(dl, "Nationalité", a.nationality); kv(dl, "Ville", a.city);
    kv(dl, "Téléphone", a.phone); kv(dl, "WhatsApp", a.whatsapp); kv(dl, "Email", a.email);
    kv(dl, "Filière", a.field_of_study); kv(dl, "Niveau", a.study_level); kv(dl, "Année académique", a.academic_year);
    root.appendChild(dl);

    root.appendChild(el("h3", null, "Réponses"));
    Object.keys(ANSWER_LABELS).forEach(function (k) {
      root.appendChild(el("strong", null, ANSWER_LABELS[k]));
      root.appendChild(el("div", "rg-ans", (a.answers || {})[k] || ""));
    });

    root.appendChild(el("h3", null, "Pièces (accès réservé à l'administration)"));
    var docs = el("div", "rg-docs");
    d.documents.forEach(function (doc) {
      var fig = el("figure"); var img = el("img"); img.alt = DOC_LABELS[doc.doc_type] || doc.doc_type;
      fig.appendChild(img); fig.appendChild(el("figcaption", null, (DOC_LABELS[doc.doc_type] || doc.doc_type) + " — " + Math.round(doc.file_size / 1024) + " Ko"));
      docs.appendChild(fig);
      fetch("/api/admin/registrations/" + a.id + "/documents/" + doc.id, { headers: { Authorization: "Bearer " + adminToken() } })
        .then(function (r) { if (!r.ok) throw new Error(); return r.blob(); })
        .then(function (b) { var u = URL.createObjectURL(b); state.blobUrls.push(u); img.src = u; img.style.cursor = "zoom-in"; img.onclick = function () { window.open(u, "_blank", "noopener"); }; })
        .catch(function () { fig.appendChild(el("div", null, "Chargement impossible")); });
    });
    if (!d.documents.length) docs.appendChild(el("span", null, "Aucune pièce."));
    root.appendChild(docs);

    root.appendChild(el("h3", null, "Consentements"));
    var ul = el("ul", "rg-hist");
    d.consents.forEach(function (c) { ul.appendChild(el("li", null, (CONSENT_LABELS[c.consent_type] || c.consent_type) + " : " + (c.accepted ? "oui" : "non") + (c.rules_version ? " (règlement " + c.rules_version + ")" : ""))); });
    root.appendChild(ul);

    // Statut + message
    root.appendChild(el("h3", null, "Statut et message au candidat"));
    var sel = el("select"); Object.keys(d.statuses).forEach(function (k) { var o = el("option", null, d.statuses[k]); o.value = k; sel.appendChild(o); }); sel.value = a.status;
    var pm = el("textarea"); pm.rows = 3; pm.value = a.public_message || ""; pm.placeholder = "Message visible par le candidat (obligatoire si « Dossier incomplet » : indique les corrections ou pièces à fournir)";
    var nt = el("textarea"); nt.rows = 2; nt.placeholder = "Note interne liée au changement (non visible par le candidat)";
    var save = el("button", "btn gold", "Enregistrer le statut"); save.type = "button";
    var msg = el("p", "error-msg");
    save.addEventListener("click", function () {
      apiFetch("/registrations/" + a.id + "/status", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: sel.value, public_message: pm.value, internal_note: nt.value }) })
        .then(function () { openDetail(a.id); loadList(); loadStats(); }).catch(function (e) { msg.textContent = e.message; });
    });
    [sel, pm, nt, save, msg].forEach(function (n) { root.appendChild(n); });

    var cb = el("button", "btn", a.is_complete ? "Marquer comme NON complet" : "Marquer comme dossier complet"); cb.type = "button";
    cb.addEventListener("click", function () {
      apiFetch("/registrations/" + a.id + "/complete", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_complete: !a.is_complete }) })
        .then(function () { openDetail(a.id); loadList(); });
    });
    root.appendChild(cb);

    root.appendChild(el("h3", null, "Commentaire interne"));
    var cm = el("textarea"); cm.rows = 2; var cbtn = el("button", "btn", "Ajouter le commentaire"); cbtn.type = "button";
    cbtn.addEventListener("click", function () {
      if (!cm.value.trim()) return;
      apiFetch("/registrations/" + a.id + "/note", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: cm.value }) }).then(function () { openDetail(a.id); });
    });
    root.appendChild(cm); root.appendChild(cbtn);

    root.appendChild(el("h3", null, "Historique des modifications"));
    var h = el("ul", "rg-hist");
    d.history.forEach(function (x) {
      var txt = x.event_type === "status"
        ? "Statut : " + (x.old_status ? (d.statuses[x.old_status] || x.old_status) + " → " : "") + (d.statuses[x.new_status] || x.new_status)
        : x.event_type === "note" ? "Commentaire interne" : "Dossier";
      var li = el("li", null, txt + (x.note ? " — " + x.note : "")); li.appendChild(el("br")); li.appendChild(el("small", null, fmt(x.created_at) + " · " + x.changed_by));
      h.appendChild(li);
    });
    root.appendChild(h);
  }
})();
