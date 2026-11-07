// Vitrine des candidats sur la page d'accueil : lecture seule, aucun vote.
(function () {
  var body = document.getElementById("showcase-body");
  if (!body) return;

  function esc(t) {
    var d = document.createElement("div");
    d.textContent = t == null ? "" : String(t);
    return d.innerHTML;
  }

  // Photos Cloudinary : recadrage portrait 4:5 centre sur le visage, qualite/format automatiques
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

  function studyLine(c) {
    return [c.study_year, c.field_of_study].filter(Boolean).join(" · ");
  }

  var ARROW = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';

  function card(c) {
    var photo = c.photo_path
      ? '<img src="' + esc(photoUrl(c.photo_path, 600)) + '" alt="Portrait de ' + esc(c.name) + '" loading="lazy" width="600" height="750" />'
      : '<div class="sc-initials" aria-hidden="true">' + esc(initials(c.name)) + "</div>";
    var study = studyLine(c);
    return (
      '<article class="sc-card">' +
      '  <div class="sc-photo">' + photo +
      (c.candidacy_number ? '<span class="sc-badge">N° ' + esc(c.candidacy_number) + "</span>" : "") +
      '    <span class="sc-cat">' + esc(c.category) + "</span>" +
      "  </div>" +
      '  <div class="sc-body">' +
      '    <h4 class="sc-name">' + esc(c.name) + "</h4>" +
      (study ? '    <p class="sc-study">' + esc(study) + "</p>" : "") +
      (c.bio ? '    <p class="sc-bio">' + esc(c.bio) + "</p>" : "") +
      '    <a class="sc-btn" href="/profil.html?id=' + encodeURIComponent(c.id) + '" aria-label="Découvrir le profil de ' + esc(c.name) + '">Découvrir le profil ' + ARROW + "</a>" +
      "  </div>" +
      "</article>"
    );
  }

  function category(title, sub, list) {
    var inner = list.length
      ? '<div class="showcase-grid">' + list.map(card).join("") + "</div>"
      : '<p class="showcase-empty-card">Les profils de cette catégorie seront bientôt dévoilés.</p>';
    return (
      '<div class="showcase-cat">' +
      '  <div class="showcase-cat-head"><h3 class="showcase-cat-title">' + esc(title) + "<small>" + esc(sub) + "</small></h3></div>" +
      inner +
      "</div>"
    );
  }

  function countF(n) { return n + (n > 1 ? " candidates" : " candidate"); }

  fetch("/api/showcase")
    .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function (data) {
      var miss = data.miss || [], mister = data.mister || [];
      if (!miss.length && !mister.length) {
        body.innerHTML = '<p class="showcase-empty-card">Les profils officiels des candidat(e)s seront dévoilés très prochainement.</p>';
        return;
      }
      body.innerHTML =
        category("Miss Flash Adjarra 2027", miss.length ? countF(miss.length) : "", miss) +
        category("Mister Flash Adjarra 2027", mister.length ? (mister.length + (mister.length > 1 ? " candidats" : " candidat")) : "", mister);
    })
    .catch(function () {
      body.innerHTML = '<p class="showcase-empty-card">Les profils ne peuvent pas être affichés pour le moment. Réessayez dans quelques instants.</p>';
    });
})();
