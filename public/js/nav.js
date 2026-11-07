/* ============================================================
   Menu unique du site, partage par toutes les pages publiques.
   Usage : placer <script src="/js/nav.js"></script> juste apres
   l'ouverture de <body>. Le script s'insere lui-meme a cet endroit,
   donc l'entete est presente avant le reste de la page (pas de
   clignotement) et avant les scripts de page.
   Pour ajouter/retirer une page : modifier uniquement MENU ci-dessous.
   ============================================================ */
(function () {
  var MENU = [
    { label: "Accueil", href: "/index.html", match: ["/", "/index.html"] },
    { label: "Candidats", href: "/candidats.html", match: ["/candidats.html", "/candidat.html"] },
    {
      label: "Inscriptions",
      href: "/inscriptions.html",
      match: ["/inscriptions.html", "/inscription-formulaire.html", "/inscription-conditions.html", "/inscription-suivi.html"],
    },
    { label: "Billetterie", href: "/billetterie.html" },
    { label: "Projets d'impact", href: "/projets.html", short: "Projets" },
    { label: "Galerie", href: "/galerie.html" },
    { label: "Résultats", href: "/resultats.html" },
    { label: "À propos", href: "/a-propos.html" },
    { label: "Partenaires", href: "/partenaires.html" },
    { label: "FAQ", href: "/faq.html" },
    { label: "Contact", href: "/contact.html" },
  ];

  var path = window.location.pathname.replace(/\/+$/, "") || "/";

  function isActive(item) {
    var targets = item.match || [item.href];
    return targets.some(function (t) {
      return t === path || (t === "/" && path === "/");
    });
  }

  function linksHtml(cls, useShort) {
    return MENU.map(function (item) {
      var label = useShort && item.short ? item.short : item.label;
      return (
        '<a class="' +
        cls +
        (isActive(item) ? " active" : "") +
        '" href="' +
        item.href +
        '"' +
        (isActive(item) ? ' aria-current="page"' : "") +
        ">" +
        label +
        "</a>"
      );
    }).join("");
  }

  var html =
    '<header class="site-header glass">' +
    '  <div class="header-bar">' +
    '    <a class="header-brand" href="/index.html">' +
    '      <img class="logo" src="/img/logo.png" alt="Miss & Mister Flash Adjarra" />' +
    '      <span class="header-titles">' +
    "        <span class=\"brand-name\">Miss &amp; Mister</span>" +
    '        <span class="brand-sub">Flash Adjarra</span>' +
    "      </span>" +
    "    </a>" +
    '    <button class="nav-toggle" id="nav-toggle" type="button" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="nav-drawer">' +
    '      <span class="nav-toggle-bars" aria-hidden="true"><span></span><span></span><span></span></span>' +
    '      <span class="nav-toggle-text">Menu</span>' +
    "    </button>" +
    "  </div>" +
    '  <nav class="site-menu" aria-label="Menu principal">' +
    linksHtml("site-menu-link", true) +
    "  </nav>" +
    "</header>" +
    '<div class="nav-backdrop" id="nav-backdrop" hidden></div>' +
    '<nav class="nav-drawer" id="nav-drawer" aria-label="Menu mobile" hidden>' +
    '  <div class="nav-drawer-head">' +
    '    <span class="nav-drawer-title">Navigation</span>' +
    '    <button class="nav-close" id="nav-close" type="button" aria-label="Fermer le menu">&times;</button>' +
    "  </div>" +
    '  <div class="nav-drawer-links">' +
    linksHtml("nav-drawer-link", false) +
    "  </div>" +
    '  <a class="btn gold block nav-drawer-cta" href="/candidats.html">Voter pour un(e) candidat(e)</a>' +
    "</nav>";

  var script = document.currentScript;
  if (script) {
    script.insertAdjacentHTML("beforebegin", html);
  } else {
    document.body.insertAdjacentHTML("afterbegin", html);
  }

  var toggle = document.getElementById("nav-toggle");
  var drawer = document.getElementById("nav-drawer");
  var backdrop = document.getElementById("nav-backdrop");
  var closeBtn = document.getElementById("nav-close");

  function openDrawer() {
    drawer.hidden = false;
    backdrop.hidden = false;
    // force reflow pour que la transition demarre proprement
    void drawer.offsetWidth;
    drawer.classList.add("open");
    backdrop.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("nav-open");
  }

  function closeDrawer() {
    drawer.classList.remove("open");
    backdrop.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
    window.setTimeout(function () {
      if (!drawer.classList.contains("open")) {
        drawer.hidden = true;
        backdrop.hidden = true;
      }
    }, 220);
  }

  toggle.addEventListener("click", function () {
    if (drawer.classList.contains("open")) closeDrawer();
    else openDrawer();
  });
  closeBtn.addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && drawer.classList.contains("open")) closeDrawer();
  });
  // Pied de page complet, identique sur toutes les pages publiques : il remplace
  // le <footer> minimal de chaque page. Les coordonnees viennent de /api/contact
  // (admin > Contact) ; une ligne sans valeur n'est pas affichee.
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
    mail: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    wa: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12.04 2a9.9 9.9 0 0 0-8.45 15.05L2 22l5.1-1.55A9.94 9.94 0 1 0 12.04 2zm0 1.8a8.14 8.14 0 1 1-4.2 15.1l-.3-.18-3 .9.92-2.9-.2-.31A8.13 8.13 0 0 1 12.04 3.8zm-3.1 4.2c-.17 0-.45.06-.69.32-.24.26-.9.88-.9 2.15s.92 2.5 1.05 2.67c.13.17 1.8 2.87 4.45 3.9 2.2.87 2.65.7 3.13.65.48-.04 1.55-.63 1.77-1.24.22-.6.22-1.13.15-1.24-.06-.11-.24-.17-.5-.3s-1.55-.77-1.8-.85c-.24-.09-.4-.13-.58.13-.18.26-.68.85-.83 1.02-.15.18-.3.2-.57.07-.26-.13-1.1-.4-2.1-1.3-.78-.69-1.3-1.55-1.45-1.8-.15-.26-.02-.4.12-.53.12-.12.26-.3.4-.45.13-.15.18-.26.26-.44.09-.17.04-.33-.02-.46-.07-.13-.58-1.4-.8-1.92-.2-.5-.42-.43-.58-.44z"/></svg>',
  };
  function byHref(hrefs) {
    return MENU.filter(function (m) { return hrefs.indexOf(m.href) !== -1; });
  }
  function colLinks(list) {
    return list.map(function (m) { return '<a href="' + m.href + '">' + m.label + "</a>"; }).join("");
  }
  document.addEventListener("DOMContentLoaded", function () {
    var footer = document.querySelector("footer");
    if (!footer || footer.classList.contains("site-footer")) return;
    footer.classList.add("site-footer");
    var navLinks = colLinks(byHref(["/index.html", "/candidats.html", "/inscriptions.html", "/billetterie.html", "/galerie.html", "/projets.html"]));
    var supportLinks = colLinks(byHref(["/resultats.html", "/a-propos.html", "/partenaires.html", "/faq.html", "/contact.html"])) +
      '<a href="/inscription-conditions.html">Conditions d\'inscription</a>';
    footer.innerHTML =
      '<div class="footer-inner">' +
      '  <div class="footer-grid">' +
      '    <div class="footer-brand">' +
      '      <a href="/index.html" class="footer-logo"><img src="/img/logo.png" alt="Miss &amp; Mister Flash Adjarra" /></a>' +
      '      <p>La plateforme officielle du concours Miss &amp; Mister Flash Adjarra, réservé aux étudiant(e)s de la FLASH Adjarra.</p>' +
      '      <div class="footer-social" id="footer-social"></div>' +
      "    </div>" +
      '    <div class="footer-col"><h4>Navigation</h4>' + navLinks + "</div>" +
      '    <div class="footer-col"><h4>Support</h4>' + supportLinks + "</div>" +
      '    <div class="footer-col footer-contact"><h4>Contact</h4><div id="footer-contact"></div></div>' +
      "  </div>" +
      '  <div class="footer-bottom"><p class="rights-line">© ' + new Date().getFullYear() + " Miss &amp; Mister Flash Adjarra. Tous droits réservés.</p></div>" +
      "</div>";
    fetch("/api/contact")
      .then(function (r) { return r.json(); })
      .then(function (c) {
        var rows = "";
        if (c.email) rows += '<a href="mailto:' + esc(c.email) + '">' + IC.mail + "<span>" + esc(c.email) + "</span></a>";
        var ph = phoneFmt(c.whatsapp);
        if (ph) rows += '<a href="tel:+' + String(c.whatsapp).replace(/\D/g, "") + '">' + IC.phone + "<span>" + esc(ph) + "</span></a>";
        if (c.address) rows += '<span class="footer-addr">' + IC.pin + "<span>" + esc(c.address) + "</span></span>";
        document.getElementById("footer-contact").innerHTML = rows;
        var num = String(c.whatsapp || "").replace(/\D/g, "");
        if (num.length >= 8) {
          document.getElementById("footer-social").innerHTML =
            '<a href="https://wa.me/' + num + '" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">' + IC.wa + "</a>";
        }
      })
      .catch(function () {});
  });

  // Le tiroir se referme si l'ecran redevient large (evite un menu bloque ouvert)
  window.addEventListener("resize", function () {
    if (window.innerWidth >= 900 && drawer.classList.contains("open")) closeDrawer();
  });
})();
