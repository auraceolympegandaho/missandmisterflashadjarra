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
    '      <img class="logo" src="/img/logo.jpg" alt="Miss & Mister Flash Adjarra" />' +
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
  // Liens de bas de page : ajoutes automatiquement dans le <footer> existant
  // de chaque page, sans toucher au contenu deja present (prix du vote, etc.).
  document.addEventListener("DOMContentLoaded", function () {
    var footer = document.querySelector("footer");
    if (!footer || footer.querySelector(".footer-links")) return;
    var nav = document.createElement("nav");
    nav.className = "footer-links";
    nav.setAttribute("aria-label", "Liens de bas de page");
    nav.innerHTML = MENU.map(function (item) {
      return '<a href="' + item.href + '">' + item.label + "</a>";
    }).join("");
    var rights = footer.querySelector(".rights-line");
    if (rights) footer.insertBefore(nav, rights);
    else footer.appendChild(nav);
  });

  // Le tiroir se referme si l'ecran redevient large (evite un menu bloque ouvert)
  window.addEventListener("resize", function () {
    if (window.innerWidth >= 900 && drawer.classList.contains("open")) closeDrawer();
  });
})();
