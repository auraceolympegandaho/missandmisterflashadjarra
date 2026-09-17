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
  loadCandidates();
  loadTransactions();
  loadPrice();
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

// --- Candidats ---
async function loadCandidates() {
  try {
    const candidates = await apiFetch("/candidates");
    const tbody = document.querySelector("#candidates-table tbody");
    tbody.innerHTML = "";
    candidates.forEach((c) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><img class="thumb" src="${c.photo_path || ""}" onerror="this.src=''"/></td>
        <td>${escapeHtml(c.candidacy_number || "—")}</td>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.category)}</td>
        <td>${c.votes_count}</td>
        <td>${c.is_active ? "Actif" : "Masqué"}</td>
        <td class="row-actions">
          <button data-id="${c.id}" class="edit-btn">Modifier</button>
          <button data-id="${c.id}" class="toggle-btn">${c.is_active ? "Masquer" : "Activer"}</button>
          <button data-id="${c.id}" class="danger delete-btn">Supprimer</button>
        </td>
      `;
      tbody.appendChild(tr);

      tr.querySelector(".edit-btn").addEventListener("click", () => openCandidateModal(c));
      tr.querySelector(".toggle-btn").addEventListener("click", () => toggleActive(c));
      tr.querySelector(".delete-btn").addEventListener("click", () => deleteCandidate(c.id));
    });
  } catch (e) {
    console.error(e);
  }
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
function openCandidateModal(candidate) {
  editingCandidateId = candidate ? candidate.id : null;
  document.getElementById("candidate-modal-title").textContent = candidate
    ? "Modifier le/la candidat(e)"
    : "Ajouter un(e) candidat(e)";
  document.getElementById("c-name").value = candidate ? candidate.name : "";
  document.getElementById("c-category").value = candidate ? candidate.category : "Miss";
  document.getElementById("c-number").value = candidate ? candidate.candidacy_number || "" : "";
  document.getElementById("c-bio").value = candidate ? candidate.bio : "";
  document.getElementById("c-project").value = candidate ? candidate.project_desc || "" : "";
  document.getElementById("c-photo").value = "";
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
  const bio = document.getElementById("c-bio").value.trim();
  const projectDesc = document.getElementById("c-project").value.trim();
  const photoFile = document.getElementById("c-photo").files[0];

  if (!name) {
    msgEl.textContent = "Le nom est requis.";
    msgEl.style.display = "block";
    return;
  }

  const form = new FormData();
  form.append("name", name);
  form.append("category", category);
  form.append("candidacy_number", candidacyNumber);
  form.append("bio", bio);
  form.append("project_desc", projectDesc);
  if (photoFile) form.append("photo", photoFile);

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

// --- Réglages ---
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

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

// --- Init ---
if (token) {
  showDashboard();
}
