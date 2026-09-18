const params = new URLSearchParams(window.location.search);
const candidateId = params.get("id");
const content = document.getElementById("profile-content");

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

// Lien de vote individuel : construit a partir du domaine reellement utilise
// pour charger la page (fonctionne sur tout environnement, pas d'adresse figee).
function getShareLink(id) {
  return `${window.location.origin}/candidat.html?id=${id}`;
}

function showNotFound() {
  content.innerHTML = `
    <div class="profile-card glass" style="text-align:center; padding:40px 24px;">
      <p style="margin:0 0 6px; font-weight:700; color:var(--blue-dark);">Candidat(e) introuvable</p>
      <p style="margin:0; color:var(--text-muted); font-size:13.5px;">
        Ce lien ne correspond à aucun(e) candidat(e) actif(ve). Il a peut-être été retiré du concours,
        ou le lien est incorrect.
      </p>
      <a href="/candidats.html" class="btn block" style="margin-top:18px;">Voir tous les candidats</a>
    </div>
  `;
}

async function loadProfile() {
  if (!candidateId) {
    showNotFound();
    return;
  }
  try {
    const res = await fetch(`/api/candidates/${candidateId}`);
    if (!res.ok) throw new Error("introuvable");
    const c = await res.json();
    const link = getShareLink(c.id);
    const waMessage = `Votez pour ${c.name} au concours Miss & Mister Flash Adjarra 2027 : ${link}`;

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
          <a class="btn gold block" href="/candidats.html?vote=${c.id}">Voter pour ${escapeHtml(c.name.split(" ")[0])}</a>

          <div class="share-row">
            <button class="btn share-btn" id="copy-link-btn" type="button">Copier le lien de vote</button>
            <button class="btn share-btn whatsapp" id="share-whatsapp-btn" type="button">Partager sur WhatsApp</button>
          </div>
          <p class="share-feedback" id="share-feedback"></p>
        </div>
      </div>
    `;

    document.getElementById("copy-link-btn").addEventListener("click", () => copyToClipboard(link));
    document.getElementById("share-whatsapp-btn").addEventListener("click", () => {
      window.open(`https://wa.me/?text=${encodeURIComponent(waMessage)}`, "_blank", "noopener");
    });
  } catch (e) {
    showNotFound();
  }
}

async function copyToClipboard(text) {
  const feedback = document.getElementById("share-feedback");
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Repli pour navigateurs/anciens contextes sans l'API Clipboard
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    feedback.textContent = "Lien copié dans le presse-papiers.";
  } catch (e) {
    feedback.textContent = "Impossible de copier automatiquement. Lien : " + text;
  }
}

loadProfile();
