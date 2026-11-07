// Page Partenaires : liste alimentee par l'API publique /api/partners
// (les partenaires sont geres depuis l'administration).
const container = document.getElementById("partners-container");

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function loadPartners() {
  try {
    const res = await fetch("/api/partners");
    if (!res.ok) throw new Error("http");
    const partners = await res.json();

    if (!partners.length) {
      container.innerHTML =
        "<p class='loading-line'>Les partenaires de cette édition seront annoncés prochainement.</p>";
      return;
    }

    container.innerHTML = `<div class="partners-page-grid">${partners
      .map((p) => {
        const inner = `
          ${p.logo_path ? `<img src="${escapeHtml(p.logo_path)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.style.display='none';" />` : ""}
          <span>${escapeHtml(p.name)}</span>`;
        return p.website_url
          ? `<a class="partner-tile" href="${escapeHtml(p.website_url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
          : `<div class="partner-tile">${inner}</div>`;
      })
      .join("")}</div>`;
  } catch (e) {
    container.innerHTML =
      "<p class='loading-line'>Impossible de charger les partenaires pour le moment. Réessayez plus tard.</p>";
  }
}

loadPartners();
