const API = "/api/admin";
let token = localStorage.getItem("admin_token") || null;
let editingCandidateId = null;

const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: { ...(options.headers || {}), ...authHeaders() },
  });
  if (res.status === 401) {
    logout();
    throw new Error("Session expirée, reconnectez-vous.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erreur serveur.");
  return data;
}

function showDashboard() {
  loginScreen.style.display = "none";
  dashboard.style.display = "block";
  loadResults();
  loadHomepage();
  loadCandidates();
  loadTransactions();
  loadAnnouncements();
  loadPartners();
  loadPrice();
  loadCountdown();
  loadPublicDisplay();
}

function logout() {
  token = null;
  localStorage.removeItem("admin_token");
  loginScreen.style.display = "flex";
  dashboard.style.display = "none";
}

document.getElementById("login-btn").addEventListener("click", async () => {
  const username = document.getElementById("login-user").value.trim();
  const password = document.getElementById("login-pass").value;
  const errEl = document.getElementById("login-error");
  errEl.style.display = "none";
  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Connexion impossible.");
    token = data.token;
    localStorage.setItem("admin_token", token);
    showDashboard();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.style.display = "block";
  }
});

document.getElementById("logout-btn").addEventListener("click", logout);

// --- Tabs ---
document.querySelectorAll(".admin-tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => (p.style.display = "none"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).style.display = "block";
  });
});

// --- Résultats ---
async function loadResults() {
  try {
    const data = await apiFetch("/results");
    document.getElementById("stat-total-fcfa").textContent =
      data.totals.total_fcfa.toLocaleString("fr-FR") + " FCFA";
    document.getElementById("stat-nb-tx").textContent = data.totals.nb_transactions_approuvees;

    const tbody = document.querySelector("#results-table tbody");
    tbody.innerHTML = "";
    data.candidates.forEach((c, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${i + 1}</td><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.category)}</td><td>${c.votes_count}</td>`;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error(e);
  }
}

// --- Accueil (contenu editable) ---
function makeRemovableRow(container, html) {
  const row = document.createElement("div");
  row.className = "repeat-row";
  row.innerHTML = html + `<button type="button" class="remove-row-btn">Retirer</button>`;
  row.querySelector(".remove-row-btn").addEventListener("click", () => row.remove());
  container.appendChild(row);
  return row;
}

function addObjectiveRow(title = "", text = "") {
  const container = document.getElementById("h-objectives-list");
  makeRemovableRow(
    container,
    `<input type="text" class="h-obj-title" placeholder="Titre" value="${escapeHtml(title)}" />
     <textarea class="h-obj-text" placeholder="Texte">${escapeHtml(text)}</textarea>`
  );
}

function addButtonRow(label = "", url = "") {
  const container = document.getElementById("h-buttons-list");
  makeRemovableRow(
    container,
    `<input type="text" class="h-btn-label" placeholder="Libellé du bouton" value="${escapeHtml(label)}" />
     <input type="text" class="h-btn-url" placeholder="Destination (/page.html ou #ancre)" value="${escapeHtml(url)}" />`
  );
}

document.getElementById("h-add-objective").addEventListener("click", () => addObjectiveRow());
document.getElementById("h-add-button").addEventListener("click", () => addButtonRow());

async function loadHomepage() {
  try {
    const data = await apiFetch("/homepage");
    document.getElementById("h-edition").value = data.hero_edition || "";
    document.getElementById("h-title").value = data.hero_title || "";
    document.getElementById("h-slogan").value = data.hero_slogan || "";
    document.getElementById("h-description").value = data.hero_description || "";
    document.getElementById("h-organizer").value = data.organizer_text || "";

    const posterPreview = document.getElementById("h-poster-preview");
    posterPreview.src = data.poster_path || "/img/logo.jpg";
    document.getElementById("h-poster").value = "";

    const objectivesList = document.getElementById("h-objectives-list");
    objectivesList.innerHTML = "";
    (data.objectives || []).forEach((o) => addObjectiveRow(o.title, o.text));

    const buttonsList = document.getElementById("h-buttons-list");
    buttonsList.innerHTML = "";
    (data.buttons || []).forEach((b) => addButtonRow(b.label, b.url));
  } catch (e) {
    console.error(e);
  }
}

document.getElementById("save-homepage-btn").addEventListener("click", async () => {
  const msgEl = document.getElementById("homepage-msg");
  msgEl.style.display = "none";

  const objectives = Array.from(document.querySelectorAll("#h-objectives-list .repeat-row")).map((row) => ({
    title: row.querySelector(".h-obj-title").value.trim(),
    text: row.querySelector(".h-obj-text").value.trim(),
  }));
  const buttons = Array.from(document.querySelectorAll("#h-buttons-list .repeat-row")).map((row) => ({
    label: row.querySelector(".h-btn-label").value.trim(),
    url: row.querySelector(".h-btn-url").value.trim(),
  }));

  const form = new FormData();
  form.append("hero_edition", document.getElementById("h-edition").value.trim());
  form.append("hero_title", document.getElementById("h-title").value.trim());
  form.append("hero_slogan", document.getElementById("h-slogan").value.trim());
  form.append("hero_description", document.getElementById("h-description").value.trim());
  form.append("organizer_text", document.getElementById("h-organizer").value.trim());
  form.append("objectives", JSON.stringify(objectives));
  form.append("buttons", JSON.stringify(buttons));
  const posterFile = document.getElementById("h-poster").files[0];
  if (posterFile) form.append("poster", posterFile);

  try {
    await apiFetch("/homepage", { method: "PUT", body: form });
    msgEl.style.color = "var(--success)";
    msgEl.textContent = "Accueil mis à jour.";
    msgEl.style.display = "block";
    loadHomepage();
  } catch (e) {
    msgEl.style.color = "var(--danger)";
    msgEl.textContent = e.message;
    msgEl.style.display = "block";
  }
});

// --- Candidats ---
async function loadCandidates() {
  try {
    const candidates = await apiFetch("/candidates");
    const tbody = document.querySelector("#candidates-table tbody");
    tbody.innerHTML = "";
    candidates.forEach((c) => {
      const tr = document.createElement("tr");
      const link = `${window.location.origin}/candidat.html?id=${c.id}`;
      tr.innerHTML = `
        <td><img class="thumb" src="${c.photo_path || ""}" onerror="this.src=''"/></td>
        <td>${escapeHtml(c.candidacy_number || "—")}</td>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.category)}</td>
        <td>${c.votes_count}</td>
        <td>${c.is_active ? "Actif" : "Masqué"}</td>
        <td><button class="copy-link-btn" data-link="${escapeHtml(link)}">Copier le lien</button></td>
        <td><a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Voir</a></td>
        <td class="row-actions">
          <button data-id="${c.id}" class="edit-btn">Modifier</button>
          <button data-id="${c.id}" class="toggle-btn">${c.is_active ? "Masquer" : "Activer"}</button>
          <button data-id="${c.id}" class="danger delete-btn">Supprimer</button>
        </td>
      `;
      tbody.appendChild(tr);

      tr.querySelector(".copy-link-btn").addEventListener("click", (e) => copyCandidateLink(e.target, link));

      tr.querySelector(".edit-btn").addEventListener("click", () => openCandidateModal(c));
      tr.querySelector(".toggle-btn").addEventListener("click", () => toggleActive(c));
      tr.querySelector(".delete-btn").addEventListener("click", () => deleteCandidate(c.id));
    });
  } catch (e) {
    console.error(e);
  }
}

async function copyCandidateLink(btn, link) {
  const original = btn.textContent;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(link);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = link;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    btn.textContent = "Copié !";
  } catch (e) {
    btn.textContent = "Échec";
  }
  setTimeout(() => (btn.textContent = original), 1800);
}

async function toggleActive(c) {
  const form = new FormData();
  form.append("is_active", c.is_active ? "0" : "1");
  await apiFetch(`/candidates/${c.id}`, { method: "PUT", body: form });
  loadCandidates();
}

async function deleteCandidate(id) {
  if (!confirm("Supprimer définitivement ce/cette candidat(e) ?")) return;
  await apiFetch(`/candidates/${id}`, { method: "DELETE" });
  loadCandidates();
  loadResults();
}

const candidateOverlay = document.getElementById("candidate-overlay");
function renderExistingPhotos(candidateId, photos) {
  const wrap = document.getElementById("c-existing-photos");
  wrap.innerHTML = "";
  (photos || []).forEach((url) => {
    const item = document.createElement("div");
    item.className = "gallery-thumb-wrap";
    item.innerHTML = `<img src="${escapeHtml(url)}" /><button type="button" class="remove-photo-btn" title="Retirer">×</button>`;
    item.querySelector(".remove-photo-btn").addEventListener("click", async () => {
      if (!confirm("Retirer cette photo de la galerie ?")) return;
      try {
        await apiFetch(`/candidates/${candidateId}/photos`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        item.remove();
        loadCandidates();
      } catch (e) {
        alert(e.message);
      }
    });
    wrap.appendChild(item);
  });
}

function openCandidateModal(candidate) {
  editingCandidateId = candidate ? candidate.id : null;
  document.getElementById("candidate-modal-title").textContent = candidate
    ? "Modifier le/la candidat(e)"
    : "Ajouter un(e) candidat(e)";
  document.getElementById("c-name").value = candidate ? candidate.name : "";
  document.getElementById("c-category").value = candidate ? candidate.category : "Miss";
  document.getElementById("c-number").value = candidate ? candidate.candidacy_number || "" : "";
  document.getElementById("c-study-year").value = candidate ? candidate.study_year || "" : "";
  document.getElementById("c-field").value = candidate ? candidate.field_of_study || "" : "";
  document.getElementById("c-bio").value = candidate ? candidate.bio : "";
  document.getElementById("c-project").value = candidate ? candidate.project_desc || "" : "";
  document.getElementById("c-video").value = candidate ? candidate.video_url || "" : "";
  document.getElementById("c-photo").value = "";
  document.getElementById("c-photos").value = "";
  renderExistingPhotos(candidate ? candidate.id : null, candidate ? candidate.photos : []);
  document.getElementById("candidate-msg").style.display = "none";
  candidateOverlay.classList.add("open");
}
document.getElementById("new-candidate-btn").addEventListener("click", () => openCandidateModal(null));
document.getElementById("close-candidate-modal").addEventListener("click", () =>
  candidateOverlay.classList.remove("open")
);

document.getElementById("save-candidate-btn").addEventListener("click", async () => {
  const msgEl = document.getElementById("candidate-msg");
  msgEl.style.display = "none";

  const name = document.getElementById("c-name").value.trim();
  const category = document.getElementById("c-category").value;
  const candidacyNumber = document.getElementById("c-number").value.trim();
  const studyYear = document.getElementById("c-study-year").value.trim();
  const fieldOfStudy = document.getElementById("c-field").value.trim();
  const bio = document.getElementById("c-bio").value.trim();
  const projectDesc = document.getElementById("c-project").value.trim();
  const videoUrl = document.getElementById("c-video").value.trim();
  const photoFile = document.getElementById("c-photo").files[0];
  const galleryFiles = document.getElementById("c-photos").files;

  if (!name) {
    msgEl.textContent = "Le nom est requis.";
    msgEl.style.display = "block";
    return;
  }

  const form = new FormData();
  form.append("name", name);
  form.append("category", category);
  form.append("candidacy_number", candidacyNumber);
  form.append("study_year", studyYear);
  form.append("field_of_study", fieldOfStudy);
  form.append("bio", bio);
  form.append("project_desc", projectDesc);
  form.append("video_url", videoUrl);
  if (photoFile) form.append("photo", photoFile);
  Array.from(galleryFiles).forEach((f) => form.append("photos", f));

  try {
    if (editingCandidateId) {
      await apiFetch(`/candidates/${editingCandidateId}`, { method: "PUT", body: form });
    } else {
      await apiFetch("/candidates", { method: "POST", body: form });
    }
    candidateOverlay.classList.remove("open");
    loadCandidates();
    loadResults();
  } catch (e) {
    msgEl.textContent = e.message;
    msgEl.style.display = "block";
  }
});

// --- Transactions ---
async function loadTransactions() {
  try {
    const rows = await apiFetch("/transactions");
    const tbody = document.querySelector("#transactions-table tbody");
    tbody.innerHTML = "";
    rows.forEach((t) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${new Date(t.created_at).toLocaleString("fr-FR")}</td>
        <td>${escapeHtml(t.candidate_name || "—")}</td>
        <td>${t.votes_bought}</td>
        <td>${t.amount_fcfa.toLocaleString("fr-FR")} FCFA</td>
        <td>${escapeHtml(t.voter_phone || "—")}</td>
        <td>${statusLabel(t.status)}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error(e);
  }
}

function statusLabel(s) {
  const map = {
    approved: '<span style="color:#1e7a3d;font-weight:600;">Payé</span>',
    pending: '<span style="color:#a06a10;">En attente</span>',
    declined: '<span style="color:#b3261e;">Refusé</span>',
    canceled: '<span style="color:#b3261e;">Annulé</span>',
  };
  return map[s] || s;
}

// --- Réglages : prix du vote ---
async function loadPrice() {
  try {
    const data = await apiFetch("/settings/price");
    document.getElementById("price-input").value = data.price_per_vote;
  } catch (e) {
    console.error(e);
  }
}
document.getElementById("save-price-btn").addEventListener("click", async () => {
  const msgEl = document.getElementById("price-msg");
  msgEl.style.display = "none";
  try {
    await apiFetch("/settings/price", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price_per_vote: Number(document.getElementById("price-input").value) }),
    });
    msgEl.style.color = "var(--success)";
    msgEl.textContent = "Prix mis à jour.";
    msgEl.style.display = "block";
  } catch (e) {
    msgEl.style.color = "var(--danger)";
    msgEl.textContent = e.message;
    msgEl.style.display = "block";
  }
});

// --- Réglages : compte à rebours de l'accueil ---
function isoToDatetimeLocal(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function loadCountdown() {
  try {
    const data = await apiFetch("/settings/countdown");
    document.getElementById("countdown-label-input").value = data.countdown_label || "";
    document.getElementById("countdown-date-input").value = isoToDatetimeLocal(data.countdown_target);
  } catch (e) {
    console.error(e);
  }
}

document.getElementById("save-countdown-btn").addEventListener("click", async () => {
  const msgEl = document.getElementById("countdown-msg");
  msgEl.style.display = "none";

  const label = document.getElementById("countdown-label-input").value.trim();
  const rawDate = document.getElementById("countdown-date-input").value;
  const isoDate = rawDate ? new Date(rawDate).toISOString() : "";

  try {
    await apiFetch("/settings/countdown", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countdown_target: isoDate, countdown_label: label }),
    });
    msgEl.style.color = "var(--success)";
    msgEl.textContent = "Compte à rebours mis à jour.";
    msgEl.style.display = "block";
  } catch (e) {
    msgEl.style.color = "var(--danger)";
    msgEl.textContent = e.message;
    msgEl.style.display = "block";
  }
});

// --- Réglages : ce que le public peut voir (votes / classement) ---
async function loadPublicDisplay() {
  try {
    const data = await apiFetch("/settings/public-display");
    document.getElementById("show-votes-input").checked = data.show_votes !== false;
    document.getElementById("show-ranking-input").checked = data.show_ranking !== false;
  } catch (e) {
    console.error(e);
  }
}

document.getElementById("save-display-btn").addEventListener("click", async () => {
  const msgEl = document.getElementById("display-msg");
  msgEl.style.display = "none";
  try {
    await apiFetch("/settings/public-display", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        show_votes: document.getElementById("show-votes-input").checked,
        show_ranking: document.getElementById("show-ranking-input").checked,
      }),
    });
    msgEl.style.color = "var(--success)";
    msgEl.textContent = "Affichage public mis à jour.";
    msgEl.style.display = "block";
  } catch (e) {
    msgEl.style.color = "var(--danger)";
    msgEl.textContent = e.message;
    msgEl.style.display = "block";
  }
});

// --- Partenaires ---
let editingPartnerId = null;
const partnerOverlay = document.getElementById("partner-overlay");

async function loadPartners() {
  try {
    const rows = await apiFetch("/partners");
    const tbody = document.querySelector("#partners-table tbody");
    tbody.innerHTML = "";
    rows.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><img class="thumb" src="${p.logo_path || ""}" onerror="this.src=''"/></td>
        <td>${escapeHtml(p.name)}</td>
        <td>${p.website_url ? `<a href="${escapeHtml(p.website_url)}" target="_blank" rel="noopener noreferrer">Lien</a>` : "—"}</td>
        <td>${p.display_order}</td>
        <td>${p.is_active ? "Visible" : "Masqué"}</td>
        <td class="row-actions">
          <button data-id="${p.id}" class="edit-partner-btn">Modifier</button>
          <button data-id="${p.id}" class="toggle-partner-btn">${p.is_active ? "Masquer" : "Afficher"}</button>
          <button data-id="${p.id}" class="danger delete-partner-btn">Supprimer</button>
        </td>
      `;
      tbody.appendChild(tr);

      tr.querySelector(".edit-partner-btn").addEventListener("click", () => openPartnerModal(p));
      tr.querySelector(".toggle-partner-btn").addEventListener("click", () => togglePartnerActive(p));
      tr.querySelector(".delete-partner-btn").addEventListener("click", () => deletePartner(p.id));
    });
  } catch (e) {
    console.error(e);
  }
}

async function togglePartnerActive(p) {
  const form = new FormData();
  form.append("is_active", p.is_active ? "0" : "1");
  await apiFetch(`/partners/${p.id}`, { method: "PUT", body: form });
  loadPartners();
}

async function deletePartner(id) {
  if (!confirm("Supprimer définitivement ce partenaire ?")) return;
  await apiFetch(`/partners/${id}`, { method: "DELETE" });
  loadPartners();
}

function openPartnerModal(partner) {
  editingPartnerId = partner ? partner.id : null;
  document.getElementById("partner-modal-title").textContent = partner
    ? "Modifier le partenaire"
    : "Ajouter un partenaire";
  document.getElementById("p-name").value = partner ? partner.name : "";
  document.getElementById("p-website").value = partner ? partner.website_url || "" : "";
  document.getElementById("p-order").value = partner ? partner.display_order : 0;
  document.getElementById("p-logo").value = "";
  document.getElementById("partner-msg").style.display = "none";
  partnerOverlay.classList.add("open");
}
document.getElementById("new-partner-btn").addEventListener("click", () => openPartnerModal(null));
document.getElementById("close-partner-modal").addEventListener("click", () =>
  partnerOverlay.classList.remove("open")
);

document.getElementById("save-partner-btn").addEventListener("click", async () => {
  const msgEl = document.getElementById("partner-msg");
  msgEl.style.display = "none";

  const name = document.getElementById("p-name").value.trim();
  const websiteUrl = document.getElementById("p-website").value.trim();
  const displayOrder = document.getElementById("p-order").value;
  const logoFile = document.getElementById("p-logo").files[0];

  if (!name) {
    msgEl.textContent = "Le nom du partenaire est requis.";
    msgEl.style.display = "block";
    return;
  }

  const form = new FormData();
  form.append("name", name);
  form.append("website_url", websiteUrl);
  form.append("display_order", displayOrder);
  if (logoFile) form.append("logo", logoFile);

  try {
    if (editingPartnerId) {
      await apiFetch(`/partners/${editingPartnerId}`, { method: "PUT", body: form });
    } else {
      await apiFetch("/partners", { method: "POST", body: form });
    }
    partnerOverlay.classList.remove("open");
    loadPartners();
  } catch (e) {
    msgEl.textContent = e.message;
    msgEl.style.display = "block";
  }
});


let editingAnnouncementId = null;
const announcementOverlay = document.getElementById("announcement-overlay");

async function loadAnnouncements() {
  try {
    const rows = await apiFetch("/announcements");
    const tbody = document.querySelector("#announcements-table tbody");
    tbody.innerHTML = "";
    rows.forEach((a) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${new Date(a.created_at).toLocaleDateString("fr-FR")}</td>
        <td>${escapeHtml(a.tag || "—")}</td>
        <td style="max-width:320px;">${escapeHtml(a.content)}</td>
        <td>${a.is_active ? "Publiée" : "Masquée"}</td>
        <td class="row-actions">
          <button data-id="${a.id}" class="edit-announcement-btn">Modifier</button>
          <button data-id="${a.id}" class="toggle-announcement-btn">${a.is_active ? "Masquer" : "Publier"}</button>
          <button data-id="${a.id}" class="danger delete-announcement-btn">Supprimer</button>
        </td>
      `;
      tbody.appendChild(tr);

      tr.querySelector(".edit-announcement-btn").addEventListener("click", () => openAnnouncementModal(a));
      tr.querySelector(".toggle-announcement-btn").addEventListener("click", () => toggleAnnouncementActive(a));
      tr.querySelector(".delete-announcement-btn").addEventListener("click", () => deleteAnnouncement(a.id));
    });
  } catch (e) {
    console.error(e);
  }
}

async function toggleAnnouncementActive(a) {
  await apiFetch(`/announcements/${a.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: a.is_active ? 0 : 1 }),
  });
  loadAnnouncements();
}

async function deleteAnnouncement(id) {
  if (!confirm("Supprimer définitivement cette actualité ?")) return;
  await apiFetch(`/announcements/${id}`, { method: "DELETE" });
  loadAnnouncements();
}

function openAnnouncementModal(announcement) {
  editingAnnouncementId = announcement ? announcement.id : null;
  document.getElementById("announcement-modal-title").textContent = announcement
    ? "Modifier l'actualité"
    : "Ajouter une actualité";
  document.getElementById("a-tag").value = announcement ? announcement.tag || "" : "";
  document.getElementById("a-content").value = announcement ? announcement.content : "";
  document.getElementById("announcement-msg").style.display = "none";
  announcementOverlay.classList.add("open");
}
document.getElementById("new-announcement-btn").addEventListener("click", () => openAnnouncementModal(null));
document.getElementById("close-announcement-modal").addEventListener("click", () =>
  announcementOverlay.classList.remove("open")
);

document.getElementById("save-announcement-btn").addEventListener("click", async () => {
  const msgEl = document.getElementById("announcement-msg");
  msgEl.style.display = "none";

  const tag = document.getElementById("a-tag").value.trim();
  const content = document.getElementById("a-content").value.trim();

  if (!content) {
    msgEl.textContent = "Le contenu est requis.";
    msgEl.style.display = "block";
    return;
  }

  try {
    if (editingAnnouncementId) {
      await apiFetch(`/announcements/${editingAnnouncementId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag, content }),
      });
    } else {
      await apiFetch("/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag, content }),
      });
    }
    announcementOverlay.classList.remove("open");
    loadAnnouncements();
  } catch (e) {
    msgEl.textContent = e.message;
    msgEl.style.display = "block";
  }
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

// --- Init ---
if (token) {
  showDashboard();
}
