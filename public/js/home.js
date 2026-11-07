/* ============================================================
   Page d'accueil : tout le contenu vient des memes API qu'avant
   (/api/homepage, /api/settings/countdown, /api/announcements,
   /api/partners, /api/registration/config) ; s'y ajoutent deux
   lectures publiques deja existantes : /api/about (etapes du
   deroulement) et /api/candidates (candidats et projets a la une).
   ============================================================ */
const OBJECTIVE_ICONS = [
  '<path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6L12 3z" stroke-linejoin="round"/>',
  '<circle cx="12" cy="7.5" r="3.25"/><path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" stroke-linecap="round"/>',
  '<path d="M9 18h6M10 21h4M8 13a4 4 0 116.5 3.1c-.6.5-1 1.1-1 1.9H10.5c0-.8-.4-1.4-1-1.9A4 4 0 018 13z" stroke-linecap="round" stroke-linejoin="round"/>',
  '<circle cx="9" cy="9" r="3.5"/><circle cx="16" cy="12" r="2.75"/><path d="M3.5 19c.4-3 2.7-5 5.5-5s5 1.9 5.6 4.6M14 15.3c2.2.1 3.9 1.7 4.5 4" stroke-linecap="round"/>',
];

const DEFAULT_STEPS = [
  { title: "Candidatures", text: "Les étudiant(e)s intéressé(e)s déposent leur dossier auprès de l'organisation." },
  { title: "Sélection", text: "Les candidat(e)s retenu(e)s sont publié(e)s avec leur projet d'impact." },
  { title: "Votes en ligne", text: "Le public soutient ses favori(te)s depuis la plateforme." },
  { title: "Soirée de gala", text: "Prestations sur scène, délibération du jury et couronnement." },
];

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// « MISS & MISTER » -> « Miss & Mister » (affichage uniquement)
function titleCase(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/(^|[\s'’-])([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase());
}

async function loadHomepage() {
  try {
    const res = await fetch("/api/homepage");
    const data = await res.json();

    document.getElementById("hero-edition").textContent = data.hero_edition || "";
    // Titre sur deux niveaux : « Miss & Mister » (grand) puis le reste (texte insere sans HTML).
    const titleEl = document.getElementById("hero-title");
    const fullTitle = data.hero_title || "";
    const m = fullTitle.match(/^(miss\s*&\s*mister)\s+(.+)$/i);
    titleEl.textContent = "";
    if (m) {
      const l1 = document.createElement("span");
      l1.className = "l1";
      l1.textContent = titleCase(m[1]);
      const l2 = document.createElement("span");
      l2.className = "l2";
      l2.textContent = titleCase(m[2]);
      titleEl.append(l1, l2);
    } else {
      titleEl.textContent = fullTitle;
    }
    document.getElementById("hero-slogan").textContent = data.hero_slogan || "";
    document.getElementById("hero-description").textContent = data.hero_description || "";
    document.title = `${data.hero_title || "Miss & Mister Flash Adjarra"} — ${data.hero_edition || ""}`;

    const poster = document.getElementById("hero-poster");
    if (data.poster_path) {
      poster.src = data.poster_path;
      document.getElementById("hero-visual").classList.add("has-poster");
    }

    // organizer_text contient volontairement une petite mise en forme (ex: <b>),
    // saisie par l'admin dans un champ dedie de la page d'accueil.
    document.getElementById("organizer-text").innerHTML = data.organizer_text || "";

    const objectives = Array.isArray(data.objectives) ? data.objectives : [];
    document.getElementById("objectives-grid").innerHTML = objectives
      .map(
        (o, i) => `
      <article class="objective">
        <span class="objective-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${OBJECTIVE_ICONS[i % OBJECTIVE_ICONS.length]}</svg></span>
        <div>
          <h3>${escapeHtml(o.title)}</h3>
          <p>${escapeHtml(o.text)}</p>
        </div>
      </article>`
      )
      .join("");

    // Bouton principal « Deposer ma candidature » (deja dans le HTML) + boutons editables de l'admin
    const ctaEl = document.getElementById("hero-cta");
    const buttons = (Array.isArray(data.buttons) ? data.buttons : []).filter(
      (b) => !/inscription/i.test(b.url || "")
    );
    ctaEl.insertAdjacentHTML(
      "beforeend",
      buttons
        .map((b) => `<a href="${escapeHtml(b.url)}" class="btn outline">${escapeHtml(b.label)}</a>`)
        .join("")
    );
  } catch (e) {
    console.error("Impossible de charger le contenu de l'accueil", e);
  }
}

async function loadPrice() {
  try {
    const res = await fetch("/api/settings/price");
    const data = await res.json();
    const pl = document.getElementById("price-label");
    if (pl) pl.textContent = data.price_per_vote;
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

async function loadSteps() {
  const track = document.getElementById("steps-track");
  let steps = DEFAULT_STEPS;
  try {
    const res = await fetch("/api/about");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.steps) && data.steps.length) steps = data.steps;
    }
  } catch (e) {
    /* on garde les etapes par defaut */
  }
  track.innerHTML = steps
    .map(
      (s, i) => `
    <li class="path-step">
      <span class="path-n">${i + 1}</span>
      <h3>${escapeHtml(s.title)}</h3>
      <p>${escapeHtml(s.text)}</p>
    </li>`
    )
    .join("");
}

async function loadPartners() {
  const marquee = document.getElementById("partners-marquee");
  const track = document.getElementById("partners-track");
  const all = document.getElementById("partners-all");
  const cta = document.getElementById("partner-cta-btn");

  // Bouton "Contacter l'equipe" : WhatsApp du comite (gere dans l'admin > Contact)
  try {
    const c = await (await fetch("/api/contact")).json();
    const num = String((c && c.whatsapp) || "").replace(/\D/g, "");
    if (num.length >= 8) {
      cta.href = `https://wa.me/${num}?text=${encodeURIComponent("Bonjour, nous souhaitons devenir partenaire de Miss & Mister Flash Adjarra.")}`;
      cta.target = "_blank";
      cta.rel = "noopener noreferrer";
    }
  } catch (e) {}

  try {
    const res = await fetch("/api/partners");
    const partners = await res.json();
    if (!partners.length) return; // pas de carrousel, seule l'invitation reste

    const item = (p, hidden) => {
      const logo = p.logo_path
        ? `<span class="pm-logo"><img src="${escapeHtml(p.logo_path)}" alt="${hidden ? "" : escapeHtml(p.name)}" loading="lazy" /></span>`
        : `<span class="pm-logo pm-fallback">${escapeHtml(p.name)}</span>`;
      const inner = `${logo}<span class="pm-name">${escapeHtml(p.name)}</span>`;
      const attrs = hidden ? ' aria-hidden="true" tabindex="-1"' : "";
      return p.website_url
        ? `<a class="partner-card"${attrs} href="${escapeHtml(p.website_url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
        : `<div class="partner-card"${attrs}>${inner}</div>`;
    };
    const base = partners.map((p) => item(p, false)).join("");
    // Defilement continu seulement s'il y a assez de logos pour remplir la ligne
    const scroll = partners.length > 4;
    track.innerHTML = scroll ? base + partners.map((p) => item(p, true)).join("") : base;
    marquee.classList.toggle("is-scrolling", scroll);
    track.style.setProperty("--pm-duration", Math.max(20, partners.length * 5) + "s");
    marquee.hidden = false;
    all.hidden = false;
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
      // Pas d'actualite : on masque toute la section (elle reapparait des qu'une actualite est publiee)
      const section = document.getElementById("actualites");
      if (section) section.style.display = "none";
      return;
    }

    const fmt = (iso) => {
      try {
        return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
      } catch (e) {
        return "";
      }
    };
    const [first, ...rest] = items;
    const tag = (a) => (a.tag ? `<span class="news-tag">${escapeHtml(a.tag)}</span>` : "");
    grid.className = "news" + (rest.length ? "" : " news-solo");
    grid.innerHTML =
      `<article class="news-main">${tag(first)}<p>${escapeHtml(first.content)}</p><time>${fmt(first.created_at)}</time></article>` +
      (rest.length
        ? `<div class="news-list">${rest
            .map(
              (a) =>
                `<article class="news-item">${tag(a)}<p>${escapeHtml(a.content)}</p><time>${fmt(a.created_at)}</time></article>`
            )
            .join("")}</div>`
        : "");
  } catch (e) {
    console.error("Impossible de charger les actualités", e);
    grid.innerHTML = "<p class='muted'>Impossible de charger les actualités.</p>";
  }
}

// Candidats et projets mis en avant : meme API publique que la page Candidats.
async function loadCandidatesAndProjects() {
  try {
    const res = await fetch("/api/candidates");
    const all = await res.json();
    if (!Array.isArray(all) || !all.length) return;

    // --- Candidats a la une : jusqu'a 3 Miss et 3 Mister ayant une photo ---
    const withPhoto = all.filter((c) => c.photo_path);
    const miss = withPhoto.filter((c) => c.category === "Miss").slice(0, 3);
    const mister = withPhoto.filter((c) => c.category === "Mister").slice(0, 3);
    let picks = [];
    for (let i = 0; i < 3; i++) {
      if (miss[i]) picks.push(miss[i]);
      if (mister[i]) picks.push(mister[i]);
    }
    if (!picks.length) picks = withPhoto.slice(0, 6);
    if (picks.length) {
      document.getElementById("featured-row").innerHTML = picks
        .map(
          (c) => `
        <a class="feat" href="/candidat.html?id=${c.id}">
          <span class="feat-photo arch"><img src="${escapeHtml(c.photo_path)}" alt="${escapeHtml(c.name)}" loading="lazy" /></span>
          <span class="feat-meta">
            <strong>${escapeHtml(c.name)}</strong>
            <small>${escapeHtml(c.category)}${c.candidacy_number ? " n° " + escapeHtml(c.candidacy_number) : ""}</small>
          </span>
        </a>`
        )
        .join("");
      const link = document.getElementById("all-candidates-link");
      if (link) link.textContent = `Voir les ${all.length} candidat${all.length > 1 ? "s" : ""}`;
      document.getElementById("candidats-une").hidden = false;
    }

    // --- Projets d'impact : trois extraits ---
    const withProject = all.filter((c) => c.project_desc && c.project_desc.trim()).slice(0, 3);
    if (withProject.length) {
      document.getElementById("home-projects").innerHTML = withProject
        .map(
          (c) => `
        <article class="project-quote">
          <p class="project-text">${escapeHtml(c.project_desc)}</p>
          <footer>
            <strong>${escapeHtml(c.name)}</strong>
            <a href="/candidat.html?id=${c.id}">Voir le profil</a>
          </footer>
        </article>`
        )
        .join("");
      document.getElementById("projets-une").hidden = false;
    }
  } catch (e) {
    console.error("Impossible de charger les candidats à la une", e);
  }
}

async function loadRegistrationChip() {
  try {
    const res = await fetch("/api/registration/config");
    const c = await res.json();
    if (c.phase !== "open") return; // rien n'est annonce tant que l'admin n'a pas ouvert
    const chip = document.getElementById("hero-reg-chip");
    chip.textContent = "Inscriptions ouvertes";
    if (c.ends_at) {
      chip.textContent += " jusqu'au " + new Date(c.ends_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    }
    chip.hidden = false;
  } catch (e) {}
}

loadHomepage();
loadRegistrationChip();
loadPrice();
loadCountdown();
loadSteps();
loadAnnouncements();
loadCandidatesAndProjects();
loadPartners();
