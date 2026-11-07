/* ============================================================
   Navigation unique du site, partagee par toutes les pages publiques.
   Usage : placer <script src="/js/nav.js"></script> juste apres
   l'ouverture de <body>. Le script s'insere lui-meme a cet endroit.

   Architecture :
   - >= 1180 px : rail lateral fixe (liens regroupes en 3 rubriques) ;
   - <  1180 px : barre compacte (marque + Voter + Menu) et panneau
                  plein ecran ouvert par le bouton Menu.
   Pour ajouter/retirer une page : modifier uniquement GROUPS ci-dessous.
   ============================================================ */
(function () {
  var GROUPS = [
    {
      title: "Le concours",
      items: [
        { label: "Accueil", href: "/index.html", match: ["/", "/index.html"] },
        { label: "À propos", href: "/a-propos.html" },
        { label: "Projets d'impact", href: "/projets.html" },
        { label: "Partenaires", href: "/partenaires.html" },
        { label: "Galerie", href: "/galerie.html" },
      ],
    },
    {
      title: "Participer",
      items: [
        { label: "Candidats", href: "/candidats.html", match: ["/candidats.html", "/candidat.html"] },
        { label: "Résultats", href: "/resultats.html" },
        {
          label: "Inscriptions",
          href: "/inscriptions.html",
          match: ["/inscriptions.html", "/inscription-formulaire.html", "/inscription-conditions.html", "/inscription-suivi.html"],
        },
        { label: "Billetterie", href: "/billetterie.html" },
        { label: "J'y serai", href: "/j-y-serai.html" },
      ],
    },
    {
      title: "Aide",
      items: [
        { label: "FAQ", href: "/faq.html" },
        { label: "Contact", href: "/contact.html" },
      ],
    },
  ];

  var path = window.location.pathname.replace(/\/+$/, "") || "/";

  function isActive(item) {
    var targets = item.match || [item.href];
    return targets.some(function (t) {
      return t === path;
    });
  }

  function groupsHtml(linkCls) {
    return GROUPS.map(function (g) {
      return (
        '<div class="nav-group">' +
        '<p class="nav-group-title">' + g.title + "</p>" +
        g.items
          .map(function (item) {
            var on = isActive(item);
            return (
              '<a class="' + linkCls + (on ? " active" : "") + '" href="' + item.href + '"' +
              (on ? ' aria-current="page"' : "") + ">" + item.label + "</a>"
            );
          })
          .join("") +
        "</div>"
      );
    }).join("");
  }

  var BRAND =
    '<img class="brand-logo" src="/img/logo.png" alt="" />' +
    '<span class="brand-text"><span class="brand-name">Miss &amp; Mister</span><span class="brand-sub">Flash Adjarra</span></span>';

  var html =
    // Rail lateral (ordinateur)
    '<aside class="rail" aria-label="Menu principal">' +
    '  <a class="rail-brand" href="/index.html" aria-label="Miss &amp; Mister Flash Adjarra, accueil">' + BRAND + "</a>" +
    '  <nav class="rail-nav">' + groupsHtml("rail-link") + "</nav>" +
    '  <div class="rail-foot">' +
    '    <a class="btn block" href="/candidats.html">Voter pour un(e) candidat(e)</a>' +
    '    <a class="rail-apply" href="/inscriptions.html">Déposer ma candidature</a>' +
    "  </div>" +
    "</aside>" +
    // Barre compacte (tablette et mobile)
    '<header class="topbar">' +
    '  <a class="topbar-brand" href="/index.html" aria-label="Miss &amp; Mister Flash Adjarra, accueil">' + BRAND + "</a>" +
    '  <div class="topbar-actions">' +
    '    <a class="btn small topbar-vote" href="/candidats.html">Voter</a>' +
    '    <button class="menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="sheet">' +
    '      <span class="menu-btn-bars" aria-hidden="true"><i></i><i></i></span>' +
    '      <span class="menu-btn-text">Menu</span>' +
    "    </button>" +
    "  </div>" +
    "</header>" +
    // Panneau plein ecran
    '<div class="sheet" id="sheet" role="dialog" aria-modal="true" aria-label="Menu" hidden>' +
    '  <div class="sheet-head">' +
    '    <span class="sheet-title">Navigation</span>' +
    '    <button class="sheet-close" id="sheet-close" type="button" aria-label="Fermer le menu">&times;</button>' +
    "  </div>" +
    '  <nav class="sheet-nav">' + groupsHtml("sheet-link") + "</nav>" +
    '  <div class="sheet-foot">' +
    '    <a class="btn block" href="/candidats.html">Voter pour un(e) candidat(e)</a>' +
    '    <a class="btn outline block" href="/inscriptions.html">Déposer ma candidature</a>' +
    "  </div>" +
    "</div>";

  var script = document.currentScript;
  if (script) script.insertAdjacentHTML("beforebegin", html);
  else document.body.insertAdjacentHTML("afterbegin", html);
  document.body.classList.add("has-rail");

  var btn = document.getElementById("menu-btn");
  var sheet = document.getElementById("sheet");
  var closeBtn = document.getElementById("sheet-close");

  function openSheet() {
    sheet.hidden = false;
    void sheet.offsetWidth; // force le reflow pour que la transition demarre
    sheet.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
    document.body.classList.add("nav-open");
    closeBtn.focus();
  }
  function closeSheet() {
    sheet.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
    window.setTimeout(function () {
      if (!sheet.classList.contains("open")) sheet.hidden = true;
    }, 260);
    btn.focus();
  }
  btn.addEventListener("click", function () {
    if (sheet.classList.contains("open")) closeSheet();
    else openSheet();
  });
  closeBtn.addEventListener("click", closeSheet);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && sheet.classList.contains("open")) closeSheet();
  });
  window.addEventListener("resize", function () {
    if (window.innerWidth >= 1180 && sheet.classList.contains("open")) closeSheet();
  });

  /* ----------------------------------------------------------
     Pied de page « colophon », identique sur toutes les pages
     publiques : il remplace le <footer> minimal de chaque page.
     Les coordonnees viennent de /api/contact (admin > Contact) ;
     une ligne sans valeur n'est pas affichee.
     ---------------------------------------------------------- */
  function esc(t) {
    var d = document.createElement("div");
    d.textContent = t || "";
    return d.innerHTML;
  }
  function phoneFmt(num) {
    var digits = String(num || "").replace(/\D/g, "");
    if (digits.length < 8) return "";
    return "+" + digits.replace(/(\d{3})(\d{2})(\d{2})(\d{2})(\d{2,})/, "$1 $2 $3 $4 $5");
  }
  var IC = {
    mail: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    wa: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12.04 2a9.9 9.9 0 0 0-8.45 15.05L2 22l5.1-1.55A9.94 9.94 0 1 0 12.04 2zm0 1.8a8.14 8.14 0 1 1-4.2 15.1l-.3-.18-3 .9.92-2.9-.2-.31A8.13 8.13 0 0 1 12.04 3.8zm-3.1 4.2c-.17 0-.45.06-.69.32-.24.26-.9.88-.9 2.15s.92 2.5 1.05 2.67c.13.17 1.8 2.87 4.45 3.9 2.2.87 2.65.7 3.13.65.48-.04 1.55-.63 1.77-1.24.22-.6.22-1.13.15-1.24-.06-.11-.24-.17-.5-.3s-1.55-.77-1.8-.85c-.24-.09-.4-.13-.58.13-.18.26-.68.85-.83 1.02-.15.18-.3.2-.57.07-.26-.13-1.1-.4-2.1-1.3-.78-.69-1.3-1.55-1.45-1.8-.15-.26-.02-.4.12-.53.12-.12.26-.3.4-.45.13-.15.18-.26.26-.44.09-.17.04-.33-.02-.46-.07-.13-.58-1.4-.8-1.92-.2-.5-.42-.43-.58-.44z"/></svg>',
  };
  function colLinks(g, extra) {
    return (
      g.items.map(function (m) { return '<a href="' + m.href + '">' + m.label + "</a>"; }).join("") + (extra || "")
    );
  }

  document.addEventListener("DOMContentLoaded", function () {
    var footer = document.querySelector("footer");
    if (!footer || footer.classList.contains("colophon")) return;
    footer.classList.add("colophon");
    footer.innerHTML =
      '<div class="colophon-inner">' +
      '  <p class="colophon-mark" aria-hidden="true">Miss &amp; Mister<br />Flash Adjarra</p>' +
      '  <div class="colophon-grid">' +
      '    <div class="colophon-about">' +
      '      <img class="colophon-logo" src="/img/logo.png" alt="Miss &amp; Mister Flash Adjarra" />' +
      "      <p>La plateforme officielle du concours Miss &amp; Mister Flash Adjarra, réservé aux étudiant(e)s de la FLASH Adjarra.</p>" +
      "    </div>" +
      '    <div class="colophon-col"><h4>' + GROUPS[0].title + "</h4>" + colLinks(GROUPS[0]) + "</div>" +
      '    <div class="colophon-col"><h4>' + GROUPS[1].title + "</h4>" +
      colLinks(GROUPS[1], '<a href="/inscription-conditions.html">Conditions d\'inscription</a>') + "</div>" +
      '    <div class="colophon-col colophon-contact"><h4>Nous joindre</h4><div id="footer-contact"></div>' +
      '      <div class="colophon-social" id="footer-social"></div></div>' +
      "  </div>" +
      '  <div class="colophon-bottom">' +
      "    <p>© " + new Date().getFullYear() + " Miss &amp; Mister Flash Adjarra. Tous droits réservés.</p>" +
      '    <a class="admin-link" href="/admin.html">Espace organisation</a>' +
      "  </div>" +
      "</div>";

    fetch("/api/contact")
      .then(function (r) { return r.json(); })
      .then(function (c) {
        var rows = "";
        if (c.email) rows += '<a href="mailto:' + esc(c.email) + '">' + IC.mail + "<span>" + esc(c.email) + "</span></a>";
        var ph = phoneFmt(c.whatsapp);
        if (ph) rows += '<a href="tel:+' + String(c.whatsapp).replace(/\D/g, "") + '">' + IC.phone + "<span>" + esc(ph) + "</span></a>";
        if (c.address) rows += '<span class="colophon-addr">' + IC.pin + "<span>" + esc(c.address) + "</span></span>";
        document.getElementById("footer-contact").innerHTML = rows;
        var num = String(c.whatsapp || "").replace(/\D/g, "");
        if (num.length >= 8) {
          document.getElementById("footer-social").innerHTML =
            '<a href="https://wa.me/' + num + '" target="_blank" rel="noopener noreferrer">' + IC.wa + "<span>Écrire sur WhatsApp</span></a>";
        }
      })
      .catch(function () {});
  });
})();
