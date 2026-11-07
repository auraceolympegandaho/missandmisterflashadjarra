function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function renderLeaderboard(elId, candidates) {
  const el = document.getElementById(elId);
  if (!candidates.length) {
    el.innerHTML = "<p style='color:var(--text-muted); font-size:13px;'>Aucun candidat dans cette catégorie.</p>";
    return;
  }
  el.innerHTML = candidates
    .map(
      (c, i) => `
    <li class="leaderboard-row ${i === 0 ? "rank-1" : ""}">
      <span class="leaderboard-rank">${i + 1}</span>
      <img class="leaderboard-photo" src="${c.photo_path || ""}" alt="${escapeHtml(c.name)}" onerror="this.style.background='#eef1f6'; this.src='';" />
      <div class="leaderboard-info">
        <div class="name">${escapeHtml(c.name)}</div>
        ${c.candidacy_number ? `<div class="number">N° ${escapeHtml(c.candidacy_number)}</div>` : ""}
      </div>
      ${typeof c.votes_count !== "undefined" ? `<div class="leaderboard-votes">${Number(c.votes_count).toLocaleString("fr-FR")} <small>votes</small></div>` : ""}
    </li>`
    )
    .join("");
}

async function loadResults() {
  try {
    // Le classement public peut etre desactive depuis l'administration
    const settings = await fetch("/api/settings/public").then((r) => r.json());
    if (settings.show_ranking === false) {
      document.querySelectorAll(".results-block").forEach((b) => (b.style.display = "none"));
      const empty = document.getElementById("empty-results");
      empty.textContent =
        "Le classement n'est pas public pour le moment. Il sera affiché dès que l'organisation l'autorisera.";
      empty.style.display = "block";
      return;
    }

    const res = await fetch("/api/candidates");
    const candidates = await res.json();

    if (!candidates.length) {
      document.getElementById("empty-results").style.display = "block";
      return;
    }

    const miss = candidates
      .filter((c) => c.category === "Miss")
      .sort((a, b) => b.votes_count - a.votes_count);
    const mister = candidates
      .filter((c) => c.category === "Mister")
      .sort((a, b) => b.votes_count - a.votes_count);

    renderLeaderboard("leaderboard-miss", miss);
    renderLeaderboard("leaderboard-mister", mister);
  } catch (e) {
    console.error("Impossible de charger les résultats", e);
  }
}

loadResults();
