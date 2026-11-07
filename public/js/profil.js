// Profil public d'un(e) candidat(e) : lecture seule, aucun vote.
// N'affiche que les champs effectivement renseignes (l'API retire les champs vides).
(function () {
  var root = document.getElementById("pf-root");

  function esc(t) {
    var d = document.createElement("div");
    d.textContent = t == null ? "" : String(t);
    return d.innerHTML;
  }
  function photoUrl(url, w) {
    if (!url) return "";
    if (/res\.cloudinary\.com/.test(url) && url.indexOf("/upload/") !== -1) {
      return url.replace("/upload/", "/upload/c_fill,g_auto,ar_4:5,w_" + w + ",q_auto,f_auto/");
    }
    return url;
  }
  function initials(name) {
    return String(name || "?").trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase();
  }
  function section(title, content) {
    return content ? '<section class="pf-sec"><h2>' + esc(title) + "</h2>" + content + "</section>" : "";
  }
  function text(v) { return v ? "<p>" + esc(v) + "</p>" : ""; }
  function chips(v) {
    if (!v) return "";
    var items = String(v).split(/[,;\n]+/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (items.length < 2) return "<p>" + esc(v) + "</p>";
    return '<ul class="pf-chips">' + items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
  }

  function notFound(msg) {
    document.title = "Profil introuvable — Miss & Mister Flash Adjarra";
    root.innerHTML =
      '<div class="pf-state"><h1>Profil indisponible</h1><p>' + esc(msg) + '</p>' +
      '<a class="btn gold pf-back-cta" href="/index.html#presentation-candidats">Voir les candidat(e)s</a></div>';
  }

  var id = new URLSearchParams(location.search).get("id");
  if (!id) return notFound("Aucun profil n'a été demandé.");

  fetch("/api/showcase/" + encodeURIComponent(id))
    .then(function (r) {
      if (r.status === 404) throw new Error("Ce profil n'est pas disponible pour le moment.");
      if (!r.ok) throw new Error("Impossible de charger ce profil. Réessayez dans quelques instants.");
      return r.json();
    })
    .then(function (c) {
      document.title = c.name + " — Miss & Mister Flash Adjarra 2027";
      var meta = document.querySelector('meta[name="description"]');
      if (meta && c.bio) meta.setAttribute("content", c.bio.slice(0, 155));

      var study = [c.study_year, c.field_of_study].filter(Boolean).join(" · ");
      var photo = c.photo_path
        ? '<img src="' + esc(photoUrl(c.photo_path, 800)) + '" alt="Portrait de ' + esc(c.name) + '" width="800" height="1000" />'
        : '<div class="sc-initials" aria-hidden="true">' + esc(initials(c.name)) + "</div>";

      root.innerHTML =
        '<div class="pf-grid">' +
        '  <div class="pf-photo-col"><div class="pf-photo">' + photo + "</div></div>" +
        '  <div class="pf-info">' +
        '    <header class="pf-head">' +
        '      <div class="pf-meta">' +
        (c.candidacy_number ? '<span class="pf-pill num">N° ' + esc(c.candidacy_number) + "</span>" : "") +
        '        <span class="pf-pill">' + esc(c.category === "Miss" ? "Miss Flash Adjarra 2027" : "Mister Flash Adjarra 2027") + "</span>" +
        "      </div>" +
        '      <h1 class="pf-name">' + esc(c.name) + "</h1>" +
        (study ? '      <p class="pf-study">' + esc(study) + "</p>" : "") +
        "    </header>" +
        section("Présentation", text(c.bio)) +
        section("Parcours universitaire", text(c.academic_path)) +
        section("Centres d'intérêt", chips(c.interests)) +
        section("Talent ou aptitude particulière", text(c.talent)) +
        section("Projet et ambition", text(c.project_desc)) +
        section("Motivation à participer", text(c.motivation)) +
        "  </div>" +
        "</div>" +
        '<div class="pf-foot"><a class="back-link" href="/index.html#presentation-candidats">&larr; Retour aux candidat(e)s</a></div>';
    })
    .catch(function (e) { notFound(e.message); });
})();
