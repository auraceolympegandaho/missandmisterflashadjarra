/* Formulaire d'inscription en 6 etapes. La validation ici sert au confort ;
   le serveur re-verifie TOUT (champs, dates, fichiers, periode d'ouverture).
   Contenu dynamique : textContent uniquement (pas d'injection HTML). */
(function () {
  var STEPS = ["Identité", "Université", "Présentation", "Photos", "Engagement", "Récapitulatif"];
  var ANSWERS = [
    { key: "q1_presentation", label: "1. Présente-toi en quelques lignes.", min: 20, max: 600 },
    { key: "q2_motivation", label: "2. Pourquoi souhaites-tu participer à MISS & MISTER FLASH ADJARRA ?", min: 20, max: 800 },
    { key: "q3_qualities", label: "3. Quelles sont tes principales qualités ?", min: 10, max: 400 },
    { key: "q4_talents", label: "4. Quels sont tes talents particuliers ?", min: 5, max: 400 },
    { key: "q5_leadership", label: "5. Quelle est ta vision du leadership étudiant ?", min: 20, max: 600 },
    { key: "q6_contribution", label: "6. Que souhaiterais-tu apporter à la FLASH Adjarra si tu devenais Miss ou Mister ?", min: 20, max: 800 },
  ];
  var DRAFT_KEY = "mmfa_reg_draft_v1";
  var cfg = null, formToken = "", current = 1, files = {}, submitting = false;

  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  var form = $("reg-form");
  var stepEls = [].slice.call(document.querySelectorAll(".reg-step"));

  // ---------- Demarrage ----------
  fetch("/api/registration/config").then(function (r) { return r.json(); }).then(function (c) {
    cfg = c;
    var banner = $("reg-banner");
    banner.hidden = false;
    banner.className = "reg-banner" + (c.phase === "open" ? " open" : "");
    banner.textContent = c.message;
    if (c.phase !== "open") {
      var back = el("a", "reg-btn ghost", "Retour aux inscriptions");
      back.href = "/inscriptions.html";
      back.style.marginTop = "12px";
      banner.appendChild(document.createElement("br"));
      banner.appendChild(back);
      return; // formulaire jamais affiche
    }
    banner.hidden = true;
    return fetch("/api/registration/form-token").then(function (r) { return r.json(); }).then(function (t) {
      formToken = t.token;
      build();
      $("form-wrap").hidden = false;
      restoreDraft();
      show(1);
    });
  }).catch(function () {
    var b = $("reg-banner");
    b.hidden = false;
    b.textContent = "Connexion impossible. Vérifie ta connexion Internet et recharge la page.";
  });

  // ---------- Construction dynamique ----------
  function selectFrom(inputId, list) {
    var input = $(inputId);
    var sel = el("select");
    sel.id = input.id; sel.name = input.name;
    sel.appendChild(el("option", null, "— Choisir —")).value = "";
    list.forEach(function (v) { var o = el("option", null, v); o.value = v; sel.appendChild(o); });
    input.parentNode.replaceChild(sel, input);
  }
  function build() {
    if (cfg.allowed_fields.length) selectFrom("f-field_of_study", cfg.allowed_fields);
    if (cfg.allowed_levels.length) selectFrom("f-study_level", cfg.allowed_levels);

    var slot = $("answers-slot");
    ANSWERS.forEach(function (a) {
      var wrap = el("div", "reg-field"); wrap.setAttribute("data-f", a.key);
      var lab = el("label", null, a.label + " "); lab.htmlFor = "a-" + a.key;
      lab.appendChild(el("span", "req", "*"));
      var ta = el("textarea"); ta.id = "a-" + a.key; ta.name = "answers." + a.key; ta.maxLength = a.max; ta.rows = 5;
      var cnt = el("div", "reg-count", "0 / " + a.max);
      ta.addEventListener("input", function () { cnt.textContent = ta.value.length + " / " + a.max; saveDraft(); });
      wrap.appendChild(lab); wrap.appendChild(ta); wrap.appendChild(cnt); wrap.appendChild(el("p", "reg-err"));
      slot.appendChild(wrap);
    });

    var fs = $("files-slot"), anyRequired = [];
    Object.keys(cfg.documents).forEach(function (type) {
      var mode = cfg.documents[type];
      if (mode === "off") return;
      var label = cfg.document_labels[type];
      var wrap = el("div", "reg-field"); wrap.setAttribute("data-f", "file_" + type);
      var lab = el("span", "reg-label", label + " "); 
      lab.appendChild(el("span", mode === "required" ? "req" : "reg-muted", mode === "required" ? "*" : "(facultatif)"));
      var drop = el("div", "reg-drop");
      var input = el("input"); input.type = "file"; input.accept = "image/jpeg,image/png,.jpg,.jpeg,.png";
      input.id = "file-" + type; input.setAttribute("aria-label", label);
      var prev = el("div", "reg-preview"), img = el("img"), side = el("div");
      img.alt = "Aperçu : " + label;
      var rm = el("button", "reg-link-btn", "Retirer"); rm.type = "button";
      side.appendChild(el("div", "reg-muted")); side.appendChild(rm);
      prev.appendChild(img); prev.appendChild(side);
      drop.appendChild(input); drop.appendChild(prev);
      wrap.appendChild(lab); wrap.appendChild(drop); wrap.appendChild(el("p", "reg-err"));
      fs.appendChild(wrap);
      input.addEventListener("change", function () { onFile(type, input, prev, img, side.firstChild, wrap); });
      rm.addEventListener("click", function () { clearFile(type, input, prev, img); });
    });
    $("files-help").textContent = "Formats acceptés : JPG, JPEG, PNG — " + cfg.max_file_mb + " Mo maximum par fichier. Les pièces restent privées : elles ne sont visibles que de l'organisation.";

    var ps = $("prog-steps");
    STEPS.forEach(function (s, i) {
      var li = el("li"); var b = el("b", null, String(i + 1)); li.appendChild(b); li.appendChild(el("span", null, s)); ps.appendChild(li);
    });

    form.addEventListener("submit", function (e) { e.preventDefault(); }); // Entree ne recharge pas la page
    form.addEventListener("input", function (e) { if (e.target.closest(".reg-field")) clearErr(e.target.closest(".reg-field")); saveDraft(); });
    form.addEventListener("change", function (e) { var f = e.target.closest(".reg-field, .reg-check"); if (f) clearErr(f); saveDraft(); });
    $("same-wa").addEventListener("change", function () {
      if (this.checked) $("f-whatsapp").value = $("f-phone").value;
    });
    $("btn-prev").addEventListener("click", function () { show(current - 1); });
    $("btn-next").addEventListener("click", function () { if (validateStep(current)) show(current + 1); });
    $("btn-submit").addEventListener("click", submit);
  }

  // ---------- Fichiers ----------
  function readHead(file) {
    return new Promise(function (resolve) {
      var fr = new FileReader();
      fr.onload = function () { resolve(new Uint8Array(fr.result)); };
      fr.onerror = function () { resolve(null); };
      fr.readAsArrayBuffer(file.slice(0, 8));
    });
  }
  function isImage(b) {
    if (!b || b.length < 8) return false;
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true;
    return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  }
  function onFile(type, input, prev, img, info, wrap) {
    var f = input.files[0];
    if (!f) return clearFile(type, input, prev, img);
    if (f.size > cfg.max_file_mb * 1024 * 1024) { clearFile(type, input, prev, img); return setErr(wrap, "Fichier trop volumineux (maximum " + cfg.max_file_mb + " Mo)."); }
    readHead(f).then(function (head) {
      if (!isImage(head)) { clearFile(type, input, prev, img); return setErr(wrap, "Format non accepté. Utilise un fichier JPG, JPEG ou PNG."); }
      clearErr(wrap);
      files[type] = f;
      if (img.src) URL.revokeObjectURL(img.src);
      img.src = URL.createObjectURL(f);
      info.textContent = f.name.length > 40 ? f.name.slice(0, 37) + "…" : f.name;
      info.textContent += " — " + (f.size / 1024 / 1024).toFixed(2) + " Mo";
      prev.classList.add("show");
    });
  }
  function clearFile(type, input, prev, img) {
    delete files[type]; input.value = "";
    if (img.src) { URL.revokeObjectURL(img.src); img.removeAttribute("src"); }
    prev.classList.remove("show");
  }

  // ---------- Validation / erreurs ----------
  function fieldEl(name) { return form.querySelector('[data-f="' + name + '"]'); }
  function setErr(wrap, msg) {
    if (!wrap) return;
    wrap.classList.add("invalid");
    var p = wrap.querySelector(".reg-err");
    if (p) p.textContent = msg;
  }
  function clearErr(wrap) {
    wrap.classList.remove("invalid");
    var p = wrap.querySelector(".reg-err");
    if (p) p.textContent = "";
  }
  function val(name) { var n = form.elements[name]; return n ? (n.value || "").trim() : ""; }

  var STEP_FIELDS = {
    1: ["last_name", "first_names", "category", "birth_date", "nationality", "city", "phone", "whatsapp", "email"],
    2: ["field_of_study", "study_level", "academic_year"],
    3: ANSWERS.map(function (a) { return a.key; }),
    4: ["file_photo", "file_student_card", "file_id_document"],
    5: ["consent_info_accuracy", "consent_rules_read", "consent_conditions_accepted", "consent_privacy_read", "consent_photo_consent"],
  };

  function validateStep(n) {
    var ok = true, first = null;
    function bad(name, msg) { var w = fieldEl(name); setErr(w, msg); ok = false; if (!first) first = w; }
    var phoneRe = /^\+?\d{8,15}$/;
    if (n === 1) {
      if (!/^[\p{L}\p{M}][\p{L}\p{M}' .-]{1,79}$/u.test(val("last_name"))) bad("last_name", "Nom invalide (2 lettres minimum).");
      if (!/^[\p{L}\p{M}][\p{L}\p{M}' .-]{1,79}$/u.test(val("first_names"))) bad("first_names", "Prénoms invalides (2 lettres minimum).");
      if (!form.querySelector('input[name="category"]:checked')) bad("category", "Choisis MISS ou MISTER.");
      var bd = val("birth_date");
      if (!bd || new Date(bd) > new Date()) bad("birth_date", "Date de naissance invalide.");
      if (val("nationality").length < 2) bad("nationality", "Nationalité requise.");
      if (val("city").length < 2) bad("city", "Ville de résidence requise.");
      if (!phoneRe.test(val("phone").replace(/[\s.\-()]/g, ""))) bad("phone", "Numéro invalide (8 à 15 chiffres).");
      if (!phoneRe.test(val("whatsapp").replace(/[\s.\-()]/g, ""))) bad("whatsapp", "Numéro WhatsApp invalide (8 à 15 chiffres).");
      var em = val("email");
      if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) bad("email", "Adresse électronique invalide.");
    }
    if (n === 2) {
      if (!val("field_of_study")) bad("field_of_study", "Filière requise.");
      if (!val("study_level")) bad("study_level", "Niveau d'études requis.");
      if (!/^\d{4}\s?[-/]\s?\d{4}$/.test(val("academic_year"))) bad("academic_year", "Format attendu : 2026-2027.");
    }
    if (n === 3) {
      ANSWERS.forEach(function (a) {
        var len = val("answers." + a.key).length;
        if (len < a.min) bad(a.key, "Réponse trop courte (minimum " + a.min + " caractères).");
      });
    }
    if (n === 4) {
      Object.keys(cfg.documents).forEach(function (t) {
        if (cfg.documents[t] === "required" && !files[t]) bad("file_" + t, cfg.document_labels[t] + " obligatoire.");
      });
    }
    if (n === 5) {
      form.querySelectorAll("[data-consent]").forEach(function (c) {
        if (!c.checked) { bad("consent_" + c.dataset.consent, "Cette case doit être cochée."); form.querySelector('[data-f="consent_' + c.dataset.consent + '"]').classList.add("invalid"); }
      });
    }
    if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
    return ok;
  }

  // ---------- Navigation ----------
  function show(n) {
    if (n < 1 || n > 6) return;
    current = n;
    stepEls.forEach(function (s) { s.hidden = Number(s.dataset.step) !== n; });
    $("btn-prev").style.visibility = n === 1 ? "hidden" : "visible";
    $("btn-next").hidden = n === 6;
    $("btn-submit").hidden = n !== 6;
    $("prog-fill").style.width = ((n - 1) / 5) * 100 + "%";
    [].slice.call($("prog-steps").children).forEach(function (li, i) {
      li.className = i + 1 === n ? "active" : i + 1 < n ? "done" : "";
    });
    if (n === 6) buildRecap();
    $("form-alert").className = "reg-alert";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildRecap() {
    var root = $("recap"); root.textContent = "";
    function block(title, step, rows) {
      root.appendChild(el("h3", null, title));
      var dl = el("dl", "reg-dl");
      rows.forEach(function (r) { dl.appendChild(el("dt", null, r[0])); dl.appendChild(el("dd", r[2] ? "reg-pre" : "", r[1] || "—")); });
      root.appendChild(dl);
      var b = el("button", "reg-link-btn", "Modifier cette section"); b.type = "button";
      b.addEventListener("click", function () { show(step); });
      root.appendChild(b);
    }
    var cat = form.querySelector('input[name="category"]:checked');
    block("Identité", 1, [["Nom", val("last_name")], ["Prénoms", val("first_names")], ["Catégorie", cat ? cat.value.toUpperCase() : ""], ["Date de naissance", val("birth_date")], ["Nationalité", val("nationality")], ["Ville", val("city")], ["Téléphone", val("phone")], ["WhatsApp", val("whatsapp")], ["Email", val("email")]]);
    block("Université", 2, [["Filière", val("field_of_study")], ["Niveau", val("study_level")], ["Année académique", val("academic_year")]]);
    block("Présentation", 3, ANSWERS.map(function (a) { return [a.label, val("answers." + a.key), true]; }));
    var fileRows = Object.keys(cfg.documents).filter(function (t) { return cfg.documents[t] !== "off"; }).map(function (t) { return [cfg.document_labels[t], files[t] ? files[t].name : "Non fournie"]; });
    block("Pièces", 4, fileRows);
    root.appendChild(el("p", "reg-notice", "Les cinq engagements de l'étape 5 sont cochés. Le dépôt ne vaut pas sélection : ton dossier sera examiné par le comité d'organisation."));
  }

  // ---------- Brouillon (texte seulement, session du navigateur) ----------
  function saveDraft() {
    try {
      var d = {};
      [].slice.call(form.elements).forEach(function (n) {
        if (!n.name || n.type === "file" || n.name === "website") return;
        if (n.type === "radio") { if (n.checked) d[n.name] = n.value; return; }
        d[n.name] = n.value;
      });
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch (e) {}
  }
  function restoreDraft() {
    try {
      var d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
      if (!d) return;
      Object.keys(d).forEach(function (k) {
        var nodes = form.querySelectorAll('[name="' + k.replace(/"/g, "") + '"]');
        nodes.forEach(function (n) {
          if (n.type === "radio") n.checked = n.value === d[k]; else n.value = d[k];
        });
      });
      ANSWERS.forEach(function (a) { var t = $("a-" + a.key); t.nextSibling.textContent = t.value.length + " / " + a.max; });
    } catch (e) {}
  }

  // ---------- Soumission ----------
  function collect() {
    var cat = form.querySelector('input[name="category"]:checked');
    var answers = {}, consents = {};
    ANSWERS.forEach(function (a) { answers[a.key] = val("answers." + a.key); });
    form.querySelectorAll("[data-consent]").forEach(function (c) { consents[c.dataset.consent] = c.checked; });
    return {
      last_name: val("last_name"), first_names: val("first_names"), category: cat ? cat.value : "",
      birth_date: val("birth_date"), nationality: val("nationality"), city: val("city"),
      phone: val("phone"), whatsapp: val("whatsapp"), email: val("email"),
      field_of_study: val("field_of_study"), study_level: val("study_level"), academic_year: val("academic_year"),
      answers: answers, consents: consents,
    };
  }
  function showAlert(msg) { var a = $("form-alert"); a.textContent = msg; a.className = "reg-alert show"; }

  function submit() {
    if (submitting) return;
    for (var i = 1; i <= 5; i++) if (!validateStep(i)) { show(i); return showAlert("Certains champs sont à corriger avant l'envoi."); }
    submitting = true;
    var btn = $("btn-submit"); btn.disabled = true; btn.textContent = "Envoi en cours…";
    var fd = new FormData();
    fd.append("form_token", formToken);
    fd.append("website", $("website").value);
    fd.append("data", JSON.stringify(collect()));
    Object.keys(files).forEach(function (t) { fd.append(t, files[t]); });
    fetch("/api/registration/submit", { method: "POST", body: fd })
      .then(function (r) { return r.json().then(function (b) { return { status: r.status, body: b }; }); })
      .then(function (r) {
        if (r.status === 201) return success(r.body);
        if (r.body.fields) {
          var firstStep = 0;
          Object.keys(r.body.fields).forEach(function (k) {
            setErr(fieldEl(k), r.body.fields[k]);
            Object.keys(STEP_FIELDS).forEach(function (s) { if (!firstStep && STEP_FIELDS[s].indexOf(k) !== -1) firstStep = Number(s); });
          });
          if (firstStep) show(firstStep);
        }
        showAlert(r.body.error || "Envoi impossible.");
        if (r.body.code === "bad_token") showAlert(r.body.error);
      })
      .catch(function () { showAlert("Connexion impossible. Ton dossier n'a pas été envoyé : réessaie."); })
      .then(function () { submitting = false; btn.disabled = false; btn.textContent = "Soumettre ma candidature"; });
  }

  function success(d) {
    try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) {}
    $("form-wrap").hidden = true; $("form-hero").hidden = true;
    var c = $("confirm"); c.hidden = false; c.textContent = "";
    c.appendChild(el("div", "crown", "♛"));
    c.appendChild(el("h2", null, "Félicitations !"));
    c.appendChild(el("p", null, "Ta candidature à MISS & MISTER FLASH ADJARRA " + cfg.edition + " a été enregistrée avec succès."));
    function codeBox(label, value) {
      var b = el("div", "reg-code"); b.appendChild(el("small", null, label));
      var o = el("output", null, value); b.appendChild(o);
      var cp = el("button", "reg-link-btn", "Copier"); cp.type = "button";
      cp.addEventListener("click", function () {
        (navigator.clipboard ? navigator.clipboard.writeText(value) : Promise.reject()).then(function () { cp.textContent = "Copié ✓"; }, function () { cp.textContent = "Copie impossible : note-le"; });
      });
      b.appendChild(cp); return b;
    }
    c.appendChild(codeBox("Référence de candidature", d.reference));
    c.appendChild(codeBox("Code de suivi personnel", d.tracking_code));
    c.appendChild(el("p", "reg-notice", "Conserve précieusement cette référence et ce code : ils sont nécessaires pour suivre l'évolution de ton dossier. Le code n'est affiché qu'une seule fois et ne pourra pas être renvoyé automatiquement."));
    c.appendChild(el("p", "reg-notice", d.email_sent
      ? "Un accusé de réception a été envoyé à l'adresse indiquée."
      : "Aucun courriel de confirmation n'a été envoyé : conserve ces informations dès maintenant."));
    c.appendChild(el("p", "reg-notice", "Attention : le dépôt de candidature ne signifie pas que tu es automatiquement retenu(e). Ton dossier devra être examiné par le comité d'organisation."));
    var dl = el("button", "reg-btn ghost", "Enregistrer ces informations (.txt)"); dl.type = "button"; dl.style.margin = "8px auto"; dl.style.maxWidth = "340px";
    dl.addEventListener("click", function () {
      var txt = "MISS & MISTER FLASH ADJARRA " + cfg.edition + "\r\nRéférence : " + d.reference + "\r\nCode de suivi : " + d.tracking_code + "\r\nSuivi : " + location.origin + "/inscription-suivi.html\r\n";
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/plain" })); a.download = "ma-candidature-" + d.reference + ".txt"; a.click();
    });
    c.appendChild(dl);
    var t = el("a", "reg-btn", "Suivre ma candidature"); t.href = "/inscription-suivi.html"; t.style.maxWidth = "340px"; t.style.margin = "8px auto";
    c.appendChild(t);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
})();
