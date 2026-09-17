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
        "<p style='text-align:center; color:var(--text-muted);'>Aucun projet renseigné pour le moment.</p>";
      return;
    }

    list.innerHTML = withProject
      .map(
        (c) => `
      <div class="profile-project" style="display:flex; gap:16px; align-items:flex-start; margin-bottom:16px;">
        <img src="${c.photo_path || ""}" alt="${escapeHtml(c.name)}" style="width:64px; height:64px; border-radius:12px; object-fit:cover; background:#fff; flex-shrink:0;" onerror="this.style.background='#fff'; this.src='';" />
        <div>
          <h2 style="margin:0 0 4px; text-transform:none; font-size:16px; color:var(--blue-dark); font-family:var(--font-display);">
            ${escapeHtml(c.name)} <span style="font-size:11px; color:var(--blue); font-weight:400;">— ${escapeHtml(c.category)}${c.candidacy_number ? " · N° " + escapeHtml(c.candidacy_number) : ""}</span>
          </h2>
          <p style="margin:0 0 8px;">${escapeHtml(c.project_desc)}</p>
          <a href="/candidat.html?id=${c.id}" style="font-size:12px; color:var(--blue-dark); text-decoration:underline;">Voir le profil complet</a>
        </div>
      </div>`
      )
      .join("");
  } catch (e) {
    list.innerHTML = "<p style='text-align:center;'>Impossible de charger les projets.</p>";
  }
}

loadProjects();
