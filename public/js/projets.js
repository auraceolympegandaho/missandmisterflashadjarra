function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

async function loadProjects() {
  const list = document.getElementById("projects-list");
  try {
    const res = await fetch("/api/candidates");
    const candidates = await res.json();
    const withProject = candidates.filter((c) => c.project_desc && c.project_desc.trim());

    if (!withProject.length) {
      list.innerHTML = "<p class='muted' style='padding-top:24px;'>Aucun projet renseigné pour le moment.</p>";
      return;
    }

    list.innerHTML = withProject
      .map(
        (c) => `
      <article class="project-row">
        <a class="project-photo arch" href="/candidat.html?id=${c.id}" aria-label="Profil de ${escapeHtml(c.name)}">
          <img src="${c.photo_path || ""}" alt="${escapeHtml(c.name)}" loading="lazy" onerror="this.removeAttribute('src');" />
        </a>
        <div class="project-body">
          <p class="project-who"><strong>${escapeHtml(c.name)}</strong>${escapeHtml(c.category)}${c.candidacy_number ? " n° " + escapeHtml(c.candidacy_number) : ""}</p>
          <p class="project-desc">${escapeHtml(c.project_desc)}</p>
          <a href="/candidat.html?id=${c.id}">Voir le profil complet</a>
        </div>
      </article>`
      )
      .join("");
  } catch (e) {
    list.innerHTML = "<p class='muted'>Impossible de charger les projets.</p>";
  }
}

loadProjects();
