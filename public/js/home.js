// Icones tournantes utilisees pour illustrer chaque objectif (le contenu
// texte, editable depuis l'admin, ne porte pas d'icone propre).
const OBJECTIVE_ICONS = [
  '<path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6L12 3z" stroke-linejoin="round"/>',
  '<circle cx="12" cy="7.5" r="3.25"/><path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" stroke-linecap="round"/>',
  '<path d="M9 18h6M10 21h4M8 13a4 4 0 116.5 3.1c-.6.5-1 1.1-1 1.9H10.5c0-.8-.4-1.4-1-1.9A4 4 0 018 13z" stroke-linecap="round" stroke-linejoin="round"/>',
  '<circle cx="9" cy="9" r="3.5"/><circle cx="16" cy="12" r="2.75"/><path d="M3.5 19c.4-3 2.7-5 5.5-5s5 1.9 5.6 4.6M14 15.3c2.2.1 3.9 1.7 4.5 4" stroke-linecap="round"/>',
];

async function loadHomepage() {
  try {
    const res = await fetch("/api/homepage");
    const data = await res.json();

    document.getElementById("hero-edition").textContent = data.hero_edition || "";
    document.getElementById("hero-title").textContent = data.hero_title || "";
    document.getElementById("hero-slogan").textContent = data.hero_slogan || "";
    document.getElementById("hero-description").textContent = data.hero_description || "";
    document.title = `${data.hero_title || "Miss & Mister Flash Adjarra"} — ${data.hero_edition || ""}`;

    const poster = document.getElementById("hero-poster");
    if (data.poster_path) poster.src = data.poster_path;

    // organizer_text contient volontairement une petite mise en forme (ex: <b>),
    // saisie par l'admin dans un champ dedie de la page d'accueil.
    document.getElementById("organizer-text").innerHTML = data.organizer_text || "";

    const objectivesGrid = document.getElementById("objectives-grid");
    const objectives = Array.isArray(data.objectives) ? data.objectives : [];
    objectivesGrid.innerHTML = objectives
      .map(
        (o, i) => `
      <div class="objective-card">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${OBJECTIVE_ICONS[i % OBJECTIVE_ICONS.length]}</svg>
        <h3>${escapeHtml(o.title)}</h3>
        <p>${escapeHtml(o.text)}</p>
      </div>`
      )
      .join("");

    const ctaEl = document.getElementById("hero-cta");
    const buttons = Array.isArray(data.buttons) ? data.buttons : [];
    ctaEl.innerHTML = buttons
      .map(
        (b, i) =>
          `<a href="${escapeHtml(b.url)}" class="btn ${i === 0 ? "gold" : "outline"}">${escapeHtml(b.label)}</a>`
      )
      .join("");
  } catch (e) {
    console.error("Impossible de charger le contenu de l'accueil", e);
  }
}

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

async function loadPartners() {
  const section = document.getElementById("partenaires");
  const grid = document.getElementById("partners-grid");
  try {
    const res = await fetch("/api/partners");
    const partners = await res.json();
    if (!partners.length) return; // section reste masquee

    grid.innerHTML = partners
      .map((p) => {
        const logo = p.logo_path
          ? `<img src="${p.logo_path}" alt="${escapeHtml(p.name)}" loading="lazy" />`
          : `<span class="partner-fallback">${escapeHtml(p.name)}</span>`;
        return p.website_url
          ? `<a class="partner-card" href="${escapeHtml(p.website_url)}" target="_blank" rel="noopener noreferrer">${logo}</a>`
          : `<div class="partner-card">${logo}</div>`;
      })
      .join("");
    section.style.display = "block";
  } catch (e) {
    console.error("Impossible de charger les partenaires", e);
  }
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

loadHomepage();
loadPrice();
loadCountdown();
loadAnnouncements();
loadPartners();
