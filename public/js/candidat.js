const params = new URLSearchParams(window.location.search);
const candidateId = params.get("id");
const content = document.getElementById("profile-content");

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

async function loadProfile() {
  if (!candidateId) {
    content.innerHTML = "<p style='text-align:center;'>Candidat(e) introuvable.</p>";
    return;
  }
  try {
    const res = await fetch(`/api/candidates/${candidateId}`);
    if (!res.ok) throw new Error("introuvable");
    const c = await res.json();

    content.innerHTML = `
      <div class="profile-card glass">
        <div class="profile-photo-wrap">
          <img class="profile-photo" src="${c.photo_path || ""}" alt="${escapeHtml(c.name)}" onerror="this.style.background='#eef1f6'; this.src='';" />
          ${c.candidacy_number ? `<span class="number-badge">N° ${escapeHtml(c.candidacy_number)}</span>` : ""}
        </div>
        <div class="profile-body">
          <span class="category">${escapeHtml(c.category)}</span>
          <h1>${escapeHtml(c.name)}</h1>
          <p class="votes"><b>${c.votes_count}</b> votes reçus</p>
          ${c.bio ? `<p class="profile-bio">${escapeHtml(c.bio)}</p>` : ""}
          ${c.project_desc ? `<div class="profile-project"><h2>Son projet</h2><p>${escapeHtml(c.project_desc)}</p></div>` : ""}
          <a class="btn gold block" href="/index.html?vote=${c.id}">Voter pour ${escapeHtml(c.name.split(" ")[0])}</a>
        </div>
      </div>
    `;
  } catch (e) {
    content.innerHTML = "<p style='text-align:center;'>Ce/cette candidat(e) est introuvable ou n'est plus actif(ve).</p>";
  }
}

loadProfile();
