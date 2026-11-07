function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

async function load() {
  try {
    const [pages, home] = await Promise.all([
      fetch("/api/pages").then((r) => r.json()),
      fetch("/api/homepage").then((r) => r.json()),
    ]);
    document.getElementById("apropos-text").textContent = (pages.apropos && pages.apropos.text) || "";
    if (home.organizer_text) {
      // organizer_text est saisi par l'administrateur (mise en forme <b> autorisee)
      document.getElementById("organizer-text").innerHTML = home.organizer_text;
      document.getElementById("organizer-card").style.display = "block";
    }
  } catch (e) {
    document.getElementById("apropos-text").textContent = "Impossible de charger cette page pour le moment.";
  }
}
load();
