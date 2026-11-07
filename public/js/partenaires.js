function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

async function load() {
  const grid = document.getElementById("partners-grid");
  try {
    const partners = await fetch("/api/partners").then((r) => r.json());
    if (!partners.length) { document.getElementById("partners-empty").style.display = "block"; return; }
    grid.innerHTML = partners.map((p) => {
      const logo = p.logo_path
        ? `<img src="${escapeHtml(p.logo_path)}" alt="${escapeHtml(p.name)}" loading="lazy" />`
        : `<span class="partner-fallback">${escapeHtml(p.name)}</span>`;
      return p.website_url
        ? `<a class="partner-card" href="${escapeHtml(p.website_url)}" target="_blank" rel="noopener noreferrer">${logo}</a>`
        : `<div class="partner-card">${logo}</div>`;
    }).join("");
  } catch (e) {
    grid.innerHTML = "<p class='empty-note'>Impossible de charger les partenaires.</p>";
  }
}
load();
