/* ============================================================
   Navigation unique du site (nouvelle architecture "Atelier").
   - Barre compacte : marque, 4 accès rapides, bouton Voter, bouton Menu.
   - Menu plein écran : toutes les pages, regroupées par intention.
   - Mobile : barre d'onglets flottante en bas d'écran.
   - Pied de page éditorial généré dans le <footer> de chaque page.
   Pour ajouter/retirer une page : modifier GROUPS ci-dessous.
   Usage : <script src="/js/nav.js"></script> juste après <body>.
   ============================================================ */
(function () {
  var GROUPS = [
    {
      title: "Le concours",
      links: [
        { label: "Accueil", href: "/index.html", match: ["/", "/index.html"] },
        { label: "À propos", href: "/a-propos.html" },
        { label: "Projets d'impact", href: "/projets.html" },
        { label: "Partenaires", href: "/partenaires.html" },
        { label: "Galerie", href: "/galerie.html" },
      ],
    },
    {
      title: "Voter et suivre",
      links: [
        { label: "Candidats", href: "/candidats.html", match: ["/candidats.html", "/candidat.html"] },
        { label: "Résultats", href: "/resultats.html" },
        { label: "Billetterie", href: "/billetterie.html" },
        { label: "J'y serai", href: "/jy-serai.html" },
      ],
    },
    {
      title: "Candidater",
      links: [
        { label: "Inscriptions", href: "/inscriptions.html", match: ["/inscriptions.html", "/inscription-formulaire.html"] },
        { label: "Conditions d'inscription", href: "/inscription-conditions.html" },
        { label: "Suivre ma candidature", href: "/inscription-suivi.html" },
      ],
    },
    {
      title: "Aide",
      links: [
        { label: "Questions fréquentes", href: "/faq.html" },
        { label: "Contact", href: "/contact.html" },
      ],
    },
  ];
  var QUICK = [
    { label: "Candidats", href: "/candidats.html", match: ["/candidats.html", "/candidat.html"] },
    { label: "Résultats", href: "/resultats.html" },
    { label: "Billetterie", href: "/billetterie.html" },
    { label: "Projets", href: "/projets.html" },
  ];

  var path = window.location.pathname.replace(/\/+$/, "") || "/";
  function isActive(item) {
    return (item.match || [item.href]).indexOf(path) !== -1;
  }
  function esc(t) {
    var d = document.createElement("div");
    d.textContent = t || "";
    return d.innerHTML;
  }
  function svg(inner, size) {
    var s = size || 22;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>";
  }
  var IC = {
    home: svg('<path d="M4 11l8-7 8 7v8.5a.5.5 0 01-.5.5H15v-5H9v5H4.5a.5.5 0 01-.5-.5V11z"/>'),
    crown: svg('<path d="M4 9l3.5 3L12 5l4.5 7L20 9l-1.5 9h-13L4 9z"/>'),
    chart: svg('<path d="M5 20V10M12 20V4M19 20v-7"/>'),
    ticket: svg('<path d="M4 8.5a1 1 0 011-1h14a1 1 0 011 1v2a2 2 0 000 4v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2a2 2 0 000-4v-2z"/><path d="M14 7.5v9" stroke-dasharray="2 2"/>'),
    menu: svg('<path d="M4 8h16M4 16h10"/>'),
    mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', 18),
    phone: svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>', 18),
    pin: svg('<path d="M12 21s7-6.2 7-11a7 7 0 00-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>', 18),
    wa: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12.04 2a9.9 9.9 0 0 0-8.45 15.05L2 22l5.1-1.55A9.94 9.94 0 1 0 12.04 2zm0 1.8a8.14 8.14 0 1 1-4.2 15.1l-.3-.18-3 .9.92-2.9-.2-.31A8.13 8.13 0 0 1 12.04 3.8zm-3.1 4.2c-.17 0-.45.06-.69.32-.24.26-.9.88-.9 2.15s.92 2.5 1.05 2.67c.13.17 1.8 2.87 4.45 3.9 2.2.87 2.65.7 3.13.65.48-.04 1.55-.63 1.77-1.24.22-.6.22-1.13.15-1.24-.06-.11-.24-.17-.5-.3s-1.55-.77-1.8-.85c-.24-.09-.4-.13-.58.13-.18.26-.68.85-.83 1.02-.15.18-.3.2-.57.07-.26-.13-1.1-.4-2.1-1.3-.78-.69-1.3-1.55-1.45-1.8-.15-.26-.02-.4.12-.53.12-.12.26-.3.4-.45.13-.15.18-.26.26-.44.09-.17.04-.33-.02-.46-.07-.13-.58-1.4-.8-1.92-.2-.5-.42-.43-.58-.44z"/></svg>',
  };

  function link(cls, item) {
    var a = isActive(item);
    return '<a class="' + cls + (a ? " active" : "") + '" href="' + item.href + '"' + (a ? ' aria-current="page"' : "") + ">" + item.label + "</a>";
  }

  var sheetGroups = GROUPS.map(function (g) {
    return '<div class="sheet-group"><h2>' + g.title + "</h2>" + g.links.map(function (l) { return link("sheet-link", l); }).join("") + "</div>";
  }).join("");

  var dock = [
    { label: "Accueil", href: "/index.html", match: ["/", "/index.html"], icon: IC.home },
    { label: "Candidats", href: "/candidats.html", match: ["/candidats.html", "/candidat.html"], icon: IC.crown },
    { label: "Résultats", href: "/resultats.html", icon: IC.chart },
    { label: "Billets", href: "/billetterie.html", icon: IC.ticket },
  ]
    .map(function (d) {
      var a = isActive(d);
      return '<a class="dock-item' + (a ? " active" : "") + '" href="' + d.href + '"' + (a ? ' aria-current="page"' : "") + ">" + d.icon + "<span>" + d.label + "</span></a>";
    })
    .join("");

  var html =
    '<a class="skip-link" href="#contenu">Aller au contenu</a>' +
    '<header class="site-header">' +
    '  <a class="brand" href="/index.html" aria-label="Miss &amp; Mister Flash Adjarra — accueil">' +
    '    <img src="/img/logo.png" alt="" width="44" height="44" />' +
    '    <span class="brand-text"><b>Miss &amp; Mister</b><i>Flash Adjarra</i></span>' +
    "  </a>" +
    '  <nav class="quick-nav" aria-label="Accès rapides">' + QUICK.map(function (l) { return link("quick-link", l); }).join("") + "</nav>" +
    '  <div class="header-actions">' +
    '    <a class="btn gold header-vote" href="/candidats.html">Voter</a>' +
    '    <button class="menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="menu-sheet"><span class="menu-bars" aria-hidden="true"></span><span class="menu-label">Menu</span></button>' +
    "  </div>" +
    "</header>" +
    '<div class="menu-sheet" id="menu-sheet" role="dialog" aria-modal="true" aria-label="Menu du site" hidden>' +
    '  <div class="sheet-inner">' +
    '    <div class="sheet-links">' + sheetGroups + "</div>" +
    '    <aside class="sheet-side">' +
    '      <div class="sheet-arch"><img src="/img/logo.png" alt="Miss &amp; Mister Flash Adjarra" /></div>' +
    '      <p class="sheet-tag">Là où le talent devient couronne.</p>' +
    '      <div class="sheet-contact" id="sheet-contact"></div>' +
    "    </aside>" +
    "  </div>" +
    "</div>" +
    '<nav class="dock" aria-label="Navigation mobile">' + dock +
    '  <button class="dock-item" id="dock-menu" type="button" aria-controls="menu-sheet">' + IC.menu + "<span>Menu</span></button>" +
    "</nav>";

  var script = document.currentScript;
  if (script) script.insertAdjacentHTML("beforebegin", html);
  else document.body.insertAdjacentHTML("afterbegin", html);

  var btn = document.getElementById("menu-btn");
  var sheet = document.getElementById("menu-sheet");
  var dockBtn = document.getElementById("dock-menu");
  var lastFocus = null;

  function setOpen(open) {
    if (open) {
      lastFocus = document.activeElement;
      sheet.hidden = false;
      void sheet.offsetWidth;
      sheet.classList.add("open");
      document.body.classList.add("menu-open");
      btn.setAttribute("aria-expanded", "true");
      var first = sheet.querySelector(".sheet-link");
      if (first) first.focus();
    } else {
      sheet.classList.remove("open");
      document.body.classList.remove("menu-open");
      btn.setAttribute("aria-expanded", "false");
      window.setTimeout(function () { if (!sheet.classList.contains("open")) sheet.hidden = true; }, 240);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
  }
  function toggle() { setOpen(!sheet.classList.contains("open")); }
  btn.addEventListener("click", toggle);
  dockBtn.addEventListener("click", toggle);
  sheet.addEventListener("click", function (e) {
    if (e.target.closest("a")) setOpen(false);
    else if (e.target === sheet || e.target.classList.contains("sheet-inner")) setOpen(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && sheet.classList.contains("open")) setOpen(false);
  });

  // Ancre de contenu pour le lien d'évitement
  document.addEventListener("DOMContentLoaded", function () {
    var main = document.querySelector("main");
    if (main && !main.id) main.id = "contenu";
  });

  function phoneFmt(num) {
    var digits = String(num || "").replace(/\D/g, "");
    if (digits.length < 8) return "";
    return "+" + digits.replace(/(\d{3})(\d{2})(\d{2})(\d{2})(\d{2,})/, "$1 $2 $3 $4 $5");
  }

  // Coordonnées (admin > Contact) : une ligne sans valeur n'est pas affichée.
  var contactPromise = null;
  function getContact() {
    if (!contactPromise) contactPromise = fetch("/api/contact").then(function (r) { return r.json(); });
    return contactPromise;
  }
  function contactRows(c) {
    var rows = "";
    if (c.email) rows += '<a href="mailto:' + esc(c.email) + '">' + IC.mail + "<span>" + esc(c.email) + "</span></a>";
    var ph = phoneFmt(c.whatsapp);
    if (ph) rows += '<a href="tel:+' + String(c.whatsapp).replace(/\D/g, "") + '">' + IC.phone + "<span>" + esc(ph) + "</span></a>";
    if (c.address) rows += '<span class="addr">' + IC.pin + "<span>" + esc(c.address) + "</span></span>";
    return rows;
  }
  getContact().then(function (c) { document.getElementById("sheet-contact").innerHTML = contactRows(c); }).catch(function () {});

  // Pied de page : remplace le <footer> minimal de chaque page.
  document.addEventListener("DOMContentLoaded", function () {
    var footer = document.querySelector("footer");
    if (!footer || footer.classList.contains("site-footer")) return;
    footer.classList.add("site-footer");
    var cols = GROUPS.map(function (g) {
      return '<div class="foot-col"><h3>' + g.title + "</h3>" + g.links.map(function (l) { return '<a href="' + l.href + '">' + l.label + "</a>"; }).join("") + "</div>";
    }).join("");
    footer.innerHTML =
      '<div class="foot-inner">' +
      '  <p class="foot-mark" aria-hidden="true">Flash<br />Adjarra</p>' +
      '  <div class="foot-grid">' +
      '    <div class="foot-brand">' +
      '      <img src="/img/logo.png" alt="Miss &amp; Mister Flash Adjarra" width="84" height="84" />' +
      "      <p>La plateforme officielle du concours, réservé aux étudiant(e)s de la FLASH Adjarra.</p>" +
      '      <div class="foot-contact" id="footer-contact"></div>' +
      '      <div class="foot-social" id="footer-social"></div>' +
      "    </div>" +
      cols +
      "  </div>" +
      '  <p class="rights-line">© ' + new Date().getFullYear() + " Miss &amp; Mister Flash Adjarra. Tous droits réservés.</p>" +
      "</div>";
    getContact()
      .then(function (c) {
        document.getElementById("footer-contact").innerHTML = contactRows(c);
        var num = String(c.whatsapp || "").replace(/\D/g, "");
        if (num.length >= 8) {
          document.getElementById("footer-social").innerHTML =
            '<a href="https://wa.me/' + num + '" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">' + IC.wa + "<span>WhatsApp</span></a>";
        }
      })
      .catch(function () {});
  });
})();
