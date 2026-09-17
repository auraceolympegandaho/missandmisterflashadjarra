const grid = document.getElementById("grid");
const emptyState = document.getElementById("empty");
const resultsCount = document.getElementById("results-count");
const searchInput = document.getElementById("search-input");
const overlay = document.getElementById("overlay");
const modalTitle = document.getElementById("modal-title");
const qtyInput = document.getElementById("qty");
const phoneInput = document.getElementById("phone");
const totalEl = document.getElementById("total");
const payBtn = document.getElementById("pay-btn");
const errorMsg = document.getElementById("error-msg");
const priceLabel = document.getElementById("price-label");

let pricePerVote = 100;
let selectedCandidate = null;
let currentCategory = "";
let currentSearch = "";
let allCandidates = [];

async function loadPrice() {
  try {
    const res = await fetch("/api/settings/price");
    const data = await res.json();
    pricePerVote = data.price_per_vote;
    priceLabel.textContent = pricePerVote;
    updateTotal();
  } catch (e) {
    console.error("Impossible de charger le prix du vote", e);
  }
}

async function loadCandidates(category) {
  const url = category ? `/api/candidates?category=${encodeURIComponent(category)}` : "/api/candidates";
  const res = await fetch(url);
  allCandidates = await res.json();
  applySearchAndRender();
}

function applySearchAndRender() {
  const q = currentSearch.trim().toLowerCase();
  const filtered = !q
    ? allCandidates
    : allCandidates.filter((c) => {
        const name = (c.name || "").toLowerCase();
        const number = (c.candidacy_number || "").toLowerCase();
        return name.includes(q) || number.includes(q);
      });
  renderGrid(filtered);
  resultsCount.textContent = filtered.length
    ? `${filtered.length} candidat${filtered.length > 1 ? "s" : ""}`
    : "";
}

function renderGrid(candidates) {
  grid.innerHTML = "";
  if (!candidates.length) {
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  const badgedCategories = new Set();

  for (const c of candidates) {
    const card = document.createElement("div");
    card.className = "card";

    const isLeader = c.votes_count > 0 && !badgedCategories.has(c.category);
    if (isLeader) badgedCategories.add(c.category);

    card.innerHTML = `
      ${isLeader ? '<span class="leader-badge"><svg class="leader-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6L12 3z"/></svg> En tête</span>' : ""}
      ${c.candidacy_number ? `<span class="number-badge">N° ${escapeHtml(c.candidacy_number)}</span>` : ""}
      <a class="photo-wrap" href="/candidat.html?id=${c.id}">
        <img class="photo" src="${c.photo_path || ""}" alt="${escapeHtml(c.name)}" onerror="this.style.background='#eef1f6'; this.src='';" />
      </a>
      <div class="info">
        <span class="category">${escapeHtml(c.category)}</span>
        <h3><a class="candidate-link" href="/candidat.html?id=${c.id}">${escapeHtml(c.name)}</a></h3>
        <p class="votes"><b>${c.votes_count}</b> votes</p>
        <a class="profile-link" href="/candidat.html?id=${c.id}">Voir le profil &amp; le projet</a>
        <button class="btn block vote-btn">Voter pour ${escapeHtml(c.name.split(" ")[0])}</button>
      </div>
    `;
    card.querySelector(".vote-btn").addEventListener("click", () => openVoteModal(c));
    grid.appendChild(card);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function openVoteModal(candidate) {
  selectedCandidate = candidate;
  modalTitle.textContent = `Voter pour ${candidate.name}`;
  qtyInput.value = 1;
  phoneInput.value = "";
  errorMsg.style.display = "none";
  updateTotal();
  overlay.classList.add("open");
}

function closeModal() {
  overlay.classList.remove("open");
  selectedCandidate = null;
}

function updateTotal() {
  const qty = Math.max(1, parseInt(qtyInput.value || "1", 10));
  totalEl.textContent = (qty * pricePerVote).toLocaleString("fr-FR");
}

document.getElementById("qty-plus").addEventListener("click", () => {
  qtyInput.value = Math.max(1, parseInt(qtyInput.value || "1", 10) + 1);
  updateTotal();
});
document.getElementById("qty-minus").addEventListener("click", () => {
  qtyInput.value = Math.max(1, parseInt(qtyInput.value || "1", 10) - 1);
  updateTotal();
});
qtyInput.addEventListener("input", updateTotal);
document.getElementById("close-modal").addEventListener("click", closeModal);
overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });

payBtn.addEventListener("click", async () => {
  errorMsg.style.display = "none";
  if (!selectedCandidate) return;

  const qty = Math.max(1, parseInt(qtyInput.value || "1", 10));
  const phone = phoneInput.value.trim();

  if (!phone || phone.length < 8) {
    errorMsg.textContent = "Entrez un numéro de téléphone valide.";
    errorMsg.style.display = "block";
    return;
  }

  payBtn.disabled = true;
  payBtn.textContent = "Redirection...";

  try {
    const res = await fetch("/api/votes/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId: selectedCandidate.id, votesCount: qty, phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur lors du paiement.");

    // Redirige vers la page de paiement hebergee par FedaPay (Mobile Money / carte)
    window.location.href = data.paymentUrl;
  } catch (e) {
    errorMsg.textContent = e.message;
    errorMsg.style.display = "block";
    payBtn.disabled = false;
    payBtn.textContent = "Payer et voter";
  }
});

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentCategory = btn.dataset.cat;
    loadCandidates(currentCategory);
  });
});

let searchDebounce;
searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    currentSearch = searchInput.value;
    applySearchAndRender();
  }, 150);
});

// Si on arrive depuis la page de profil avec ?vote=ID, on ouvre directement
// la fenetre de vote pour ce/cette candidat(e).
async function openVoteFromQuery() {
  const voteId = new URLSearchParams(window.location.search).get("vote");
  if (!voteId) return;
  try {
    const res = await fetch(`/api/candidates/${voteId}`);
    if (res.ok) {
      const candidate = await res.json();
      openVoteModal(candidate);
    }
  } catch (e) {
    console.error("Impossible d'ouvrir le vote depuis le lien", e);
  }
}

loadPrice();
loadCandidates("");
openVoteFromQuery();
