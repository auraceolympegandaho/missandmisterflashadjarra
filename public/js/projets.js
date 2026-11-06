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
      list.innerHTML =
        "<p class='empty-state'>Aucun projet renseigné pour le moment.</p>";
      return;
    }

    list.innerHTML = withProject
      .map(
        (c) => `
      <article class="project-row">
        <img class="project-thumb" src="${c.photo_path || ""}" alt="${escapeHtml(c.name)}" onerror="this.style.visibility='hidden';" />
        <h2>${escapeHtml(c.name)}</h2>
        <p class="project-meta">${escapeHtml(c.category)}${c.candidacy_number ? " · N° " + escapeHtml(c.candidacy_number) : ""}</p>
        <div>
          <p class="project-text">${escapeHtml(c.project_desc)}</p>
          <a class="text-link" href="/candidat.html?id=${c.id}">Voir le profil complet</a>
        </div>
      </article>`
      )
      .join("");
  } catch (e) {
    list.innerHTML = "<p class='empty-state'>Impossible de charger les projets.</p>";
  }
}

loadProjects();
