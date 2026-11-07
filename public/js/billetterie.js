function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

async function load() {
  try {
    const pages = await fetch("/api/pages").then((r) => r.json());
    const b = pages.billetterie || {};
    document.getElementById("bill-intro").textContent = b.intro || "";
    document.getElementById("bill-infos").textContent = b.infos || "";
    document.getElementById("bill-note").textContent = b.contact_note || "";
  } catch (e) {
    document.getElementById("bill-intro").textContent = "Impossible de charger cette page pour le moment.";
  }
}
load();
