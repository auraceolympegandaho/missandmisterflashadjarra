function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

async function loadGallery() {
  const grid = document.getElementById("gallery-grid");
  try {
    const res = await fetch("/api/candidates");
    const candidates = await res.json();
    const withPhoto = candidates.filter((c) => c.photo_path);

    if (!withPhoto.length) {
      grid.innerHTML =
        "<p style='text-align:center; color:var(--text-muted); grid-column:1/-1;'>Aucune photo disponible pour le moment.</p>";
      return;
    }

    grid.innerHTML = withPhoto
      .map(
        (c) => `
      <a class="gallery-item" href="/candidat.html?id=${c.id}">
        <img src="${c.photo_path}" alt="${escapeHtml(c.name)}" loading="lazy" />
        <span class="gallery-caption">${escapeHtml(c.name)}${c.candidacy_number ? " · N° " + escapeHtml(c.candidacy_number) : ""}</span>
      </a>`
      )
      .join("");
  } catch (e) {
    grid.innerHTML = "<p style='text-align:center;'>Impossible de charger la galerie.</p>";
  }
}

loadGallery();
