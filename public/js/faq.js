function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

async function load() {
  const list = document.getElementById("faq-list");
  try {
    const pages = await fetch("/api/pages").then((r) => r.json());
    const items = (pages.faq || []).filter((i) => i.question && i.answer);
    if (!items.length) { document.getElementById("faq-empty").style.display = "block"; return; }
    list.innerHTML = items.map((i) => `
      <details class="faq-item">
        <summary>${escapeHtml(i.question)}</summary>
        <div class="faq-answer">${escapeHtml(i.answer)}</div>
      </details>`).join("");
  } catch (e) {
    list.innerHTML = "<p class='empty-note'>Impossible de charger la FAQ pour le moment.</p>";
  }
}
load();
