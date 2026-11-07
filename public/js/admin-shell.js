/* Coque de l'administration : tiroir mobile et titre de section.
   N'agit que sur l'affichage ; la logique des onglets reste dans admin.js. */
(function () {
  var side = document.getElementById("adm-side");
  var scrim = document.getElementById("adm-scrim");
  var menu = document.getElementById("adm-menu");
  var title = document.getElementById("adm-title");

  function setOpen(open) {
    side.classList.toggle("open", open);
    scrim.hidden = !open;
    menu.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("adm-lock", open);
  }
  menu.addEventListener("click", function () { setOpen(!side.classList.contains("open")); });
  scrim.addEventListener("click", function () { setOpen(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });

  document.querySelectorAll(".admin-tab-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      title.textContent = b.textContent;
      setOpen(false);
      window.scrollTo(0, 0);
    });
  });
})();
