async function loadPrice() {
  try {
    const res = await fetch("/api/settings/price");
    const data = await res.json();
    document.getElementById("price-label").textContent = data.price_per_vote;
  } catch (e) {
    console.error("Impossible de charger le prix du vote", e);
  }
}

let countdownTarget = null;
let countdownInterval = null;

async function loadCountdown() {
  const labelEl = document.getElementById("countdown-label");
  const gridEl = document.getElementById("countdown-grid");
  const emptyEl = document.getElementById("countdown-empty");

  try {
    const res = await fetch("/api/settings/countdown");
    const data = await res.json();

    if (!data.countdown_target) {
      labelEl.textContent = data.countdown_label || "Échéance à venir";
      gridEl.style.display = "none";
      emptyEl.style.display = "block";
      return;
    }

    const target = new Date(data.countdown_target).getTime();
    if (isNaN(target)) {
      labelEl.textContent = data.countdown_label || "Échéance à venir";
      gridEl.style.display = "none";
      emptyEl.style.display = "block";
      return;
    }

    labelEl.textContent = data.countdown_label || "Échéance";
    countdownTarget = target;
    gridEl.style.display = "flex";
    emptyEl.style.display = "none";
    tickCountdown();
    countdownInterval = setInterval(tickCountdown, 1000);
  } catch (e) {
    console.error("Impossible de charger le compte à rebours", e);
    labelEl.textContent = "Échéance à venir";
    emptyEl.style.display = "block";
  }
}

function tickCountdown() {
  if (countdownTarget === null) return;
  const now = Date.now();
  let diff = Math.max(0, countdownTarget - now);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  diff -= days * 1000 * 60 * 60 * 24;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  diff -= hours * 1000 * 60 * 60;
  const minutes = Math.floor(diff / (1000 * 60));
  diff -= minutes * 1000 * 60;
  const seconds = Math.floor(diff / 1000);

  document.getElementById("cd-days").textContent = days;
  document.getElementById("cd-hours").textContent = String(hours).padStart(2, "0");
  document.getElementById("cd-min").textContent = String(minutes).padStart(2, "0");
  document.getElementById("cd-sec").textContent = String(seconds).padStart(2, "0");

  if (countdownTarget - now <= 0 && countdownInterval) {
    clearInterval(countdownInterval);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

async function loadAnnouncements() {
  const grid = document.getElementById("news-grid");
  try {
    const res = await fetch("/api/announcements");
    const items = await res.json();

    if (!items.length) {
      grid.innerHTML =
        "<p style='text-align:center; color:var(--text-muted); grid-column:1/-1; font-size:13px;'>Aucune actualité pour le moment.</p>";
      return;
    }

    grid.innerHTML = items
      .map(
        (a) => `
      <div class="news-card">
        ${a.tag ? `<span class="news-tag">${escapeHtml(a.tag)}</span>` : ""}
        <p>${escapeHtml(a.content)}</p>
      </div>`
      )
      .join("");
  } catch (e) {
    console.error("Impossible de charger les actualités", e);
    grid.innerHTML =
      "<p style='text-align:center; color:var(--text-muted); grid-column:1/-1; font-size:13px;'>Impossible de charger les actualités.</p>";
  }
}

loadPrice();
loadCountdown();
loadAnnouncements();
