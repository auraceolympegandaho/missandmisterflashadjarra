// Page FAQ : contenu entierement pilote par /api/faq (gere dans l'admin).
const container = document.getElementById("faq-container");

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function loadFaq() {
  try {
    const res = await fetch("/api/faq");
    if (!res.ok) throw new Error("http");
    const data = await res.json();
    const sections = Array.isArray(data.sections) ? data.sections : [];

    if (!sections.length) {
      container.innerHTML =
        "<p class='loading-line'>La FAQ sera bientôt disponible.</p>";
      return;
    }

    container.innerHTML = sections
      .map(
        (section) => `
      <div class="panel">
        <h2>${escapeHtml(section.title)}</h2>
        ${(section.items || [])
          .map(
            (item) => `
          <details class="faq-item">
            <summary>${escapeHtml(item.q)}</summary>
            <p class="faq-answer">${escapeHtml(item.a)}</p>
          </details>`
          )
          .join("")}
      </div>`
      )
      .join("");
  } catch (e) {
    container.innerHTML =
      "<p class='loading-line'>Impossible de charger la FAQ pour le moment. Réessayez plus tard.</p>";
  }
}

loadFaq();
