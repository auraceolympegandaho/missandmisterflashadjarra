function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function safeUrl(u) { return /^https?:\/\//i.test(u) ? u : "https://" + u; }

async function load() {
  const grid = document.getElementById("contact-grid");
  try {
    const pages = await fetch("/api/pages").then((r) => r.json());
    const c = pages.contact || {};
    const items = [];
    if (c.phone) items.push(["Téléphone", c.phone, "tel:" + c.phone.replace(/[^\d+]/g, "")]);
    if (c.whatsapp) items.push(["WhatsApp", c.whatsapp, "https://wa.me/" + c.whatsapp.replace(/\D/g, "")]);
    if (c.email) items.push(["E-mail", c.email, "mailto:" + c.email]);
    if (c.facebook) items.push(["Facebook", c.facebook, safeUrl(c.facebook)]);
    if (c.address) items.push(["Adresse", c.address, ""]);
    if (!items.length) { document.getElementById("contact-empty").style.display = "block"; return; }
    grid.innerHTML = items.map(([label, value, href]) => {
      const inner = `<span class="contact-label">${label}</span><span class="contact-value">${escapeHtml(value)}</span>`;
      return href
        ? `<a class="contact-item" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
        : `<div class="contact-item">${inner}</div>`;
    }).join("");
  } catch (e) {
    grid.innerHTML = "<p class='empty-note'>Impossible de charger les coordonnées.</p>";
  }
}
load();
