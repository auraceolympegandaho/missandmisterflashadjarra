/* ============================================================
   Fiche publique d'un(e) candidat(e).
   Affiche : photo, nom, numero, categorie, filiere, annee d'etude,
   biographie, projet d'impact, galerie/video, votes et classement
   (si les parametres publics l'autorisent), bouton de vote et
   boutons de copie / partage du lien.
   ============================================================ */

const params = new URLSearchParams(window.location.search);
const candidateId = params.get("id");
const content = document.getElementById("profile-content");
const voteBar = document.getElementById("vote-bar");

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str === 0 ? "0" : str || "";
  // On echappe aussi les guillemets : ces valeurs sont parfois inserees
  // dans des attributs HTML (src, href, alt).
  return div.innerHTML.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Initiales affichees a la place de la photo quand celle-ci manque
function initials(name) {
  return (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function formatNumber(n) {
  return Number(n || 0).toLocaleString("fr-FR");
}

// Lien de partage construit a partir du domaine reellement utilise :
// fonctionne en local comme en production, sans adresse figee.
function getShareLink(id) {
  return `${window.location.origin}/candidat.html?id=${id}`;
}

// Lecteur integre pour YouTube ; sinon simple lien externe
// (couvre Facebook, TikTok, Instagram ou tout autre lien fourni).
function buildVideoEmbed(url) {
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/
  );
  if (ytMatch) {
    return `
      <section class="profile-section">
        <h2 class="profile-section-title">Vidéo de présentation</h2>
        <div class="profile-video-frame">
          <iframe src="https://www.youtube.com/embed/${ytMatch[1]}" title="Vidéo de présentation"
            loading="lazy" frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen></iframe>
        </div>
      </section>`;
  }
  return `
    <section class="profile-section">
      <h2 class="profile-section-title">Vidéo de présentation</h2>
      <p class="profile-video-link">
        <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">▶ Ouvrir la vidéo</a>
      </p>
    </section>`;
}

// Messages d'erreur explicites : lien invalide vs profil retire du concours.
function showMessage(title, text) {
  voteBar.hidden = true;
  content.innerHTML = `
    <div class="profile-card profile-message">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(text)}</p>
      <a href="/candidats.html" class="btn block">Voir tous les candidats</a>
      <a href="/index.html" class="profile-message-link">Retour à l'accueil</a>
    </div>`;
}

function showNotFound(reason) {
  if (reason === "disabled") {
    showMessage(
      "Profil non disponible",
      "Ce/cette candidat(e) ne participe plus au concours ou son profil a été retiré par l'organisation. Les votes ne sont plus possibles sur cette fiche."
    );
  } else {
    showMessage(
      "Candidat(e) introuvable",
      "Ce lien ne correspond à aucune fiche. Il a peut-être été mal copié ou modifié. Vérifiez le lien ou parcourez la liste complète des candidat(e)s."
    );
  }
}

function showNetworkError() {
  voteBar.hidden = true;
  content.innerHTML = `
    <div class="profile-card profile-message">
      <h1>Connexion impossible</h1>
      <p>Le profil n'a pas pu être chargé. Vérifiez votre connexion internet puis réessayez.</p>
      <button class="btn block" type="button" id="retry-btn">Réessayer</button>
      <a href="/candidats.html" class="profile-message-link">Voir tous les candidats</a>
    </div>`;
  document.getElementById("retry-btn").addEventListener("click", loadProfile);
}

async function loadProfile() {
  if (!candidateId) {
    showNotFound("not_found");
    return;
  }
  let res;
  try {
    res = await fetch(`/api/candidates/${encodeURIComponent(candidateId)}`);
  } catch (e) {
    showNetworkError();
    return;
  }

  if (!res.ok) {
    let reason = "not_found";
    try {
      const data = await res.json();
      reason = data.reason || reason;
    } catch (e) {
      /* reponse sans corps JSON : on garde le message generique */
    }
    if (res.status >= 500) showNetworkError();
    else showNotFound(reason);
    return;
  }

  let c;
  try {
    c = await res.json();
  } catch (e) {
    showNetworkError();
    return;
  }

  render(c);
}

function render(c) {
  const link = getShareLink(c.id);
  const firstName = (c.name || "").split(" ")[0];
  const shareText = `Votez pour ${c.name} au concours Miss & Mister Flash Adjarra : ${link}`;

  // Identite : filiere et annee d'etude affichees separement et etiquetees
  const facts = [];
  if (c.field_of_study) facts.push({ label: "Filière", value: c.field_of_study });
  if (c.study_year) facts.push({ label: "Année d'étude", value: c.study_year });
  const factsHtml = facts.length
    ? `<dl class="profile-facts">${facts
        .map(
          (f) =>
            `<div class="profile-fact"><dt>${escapeHtml(f.label)}</dt><dd>${escapeHtml(f.value)}</dd></div>`
        )
        .join("")}</dl>`
    : "";

  // Votes et classement : affiches uniquement si les parametres publics l'autorisent
  const stats = [];
  if (typeof c.votes_count !== "undefined") {
    stats.push(
      `<div class="stat"><span class="stat-num">${formatNumber(c.votes_count)}</span><span class="stat-label">votes reçus</span></div>`
    );
  }
  if (typeof c.rank !== "undefined") {
    stats.push(
      `<div class="stat"><span class="stat-num">${escapeHtml(c.rank)}<sup>${c.rank === 1 ? "er" : "e"}</sup></span><span class="stat-label">sur ${escapeHtml(c.category_total)} en ${escapeHtml(c.category)}</span></div>`
    );
  }
  const statsHtml = stats.length
    ? `<div class="profile-stats">${stats.join("")}</div>`
    : `<p class="profile-stats-hidden">Les votes et le classement ne sont pas publics pour le moment.</p>`;

  const photos = Array.isArray(c.photos) ? c.photos.filter(Boolean) : [];
  const galleryHtml = photos.length
    ? `<section class="profile-section">
         <h2 class="profile-section-title">Galerie</h2>
         <div class="profile-gallery">${photos
           .map(
             (p, i) =>
               `<button type="button" class="gallery-item" data-src="${escapeHtml(p)}" aria-label="Agrandir la photo ${i + 1}">
                  <img src="${escapeHtml(p)}" alt="${escapeHtml(c.name)} — photo ${i + 1}" loading="lazy" />
                </button>`
           )
           .join("")}</div>
       </section>`
    : "";

  const videoHtml = c.video_url ? buildVideoEmbed(c.video_url) : "";

  content.innerHTML = `
    <article class="profile-card">
      <div class="profile-photo-wrap">
        ${
          c.photo_path
            ? `<img class="profile-photo" src="${escapeHtml(c.photo_path)}" alt="Photo de ${escapeHtml(c.name)}"
                 onerror="this.closest('.profile-photo-wrap').classList.add('no-photo'); this.remove();" />`
            : ""
        }
        <span class="photo-placeholder" aria-hidden="true">${escapeHtml(initials(c.name))}</span>
        <div class="profile-photo-badges">
          <span class="badge badge-cat">${escapeHtml(c.category)}</span>
          ${c.candidacy_number ? `<span class="badge badge-num">N° ${escapeHtml(c.candidacy_number)}</span>` : ""}
        </div>
      </div>

      <div class="profile-body">
        <h1>${escapeHtml(c.name)}</h1>
        ${factsHtml}
        ${statsHtml}

        <a class="btn gold block profile-vote-btn" href="/candidats.html?vote=${c.id}">
          Voter pour ${escapeHtml(firstName)}
        </a>

        <div class="share-row">
          <button class="btn share-btn" id="copy-link-btn" type="button">Copier le lien</button>
          <button class="btn share-btn" id="share-btn" type="button">Partager</button>
          <button class="btn share-btn whatsapp" id="share-whatsapp-btn" type="button">WhatsApp</button>
        </div>
        <p class="share-feedback" id="share-feedback" role="status"></p>

        ${
          c.bio
            ? `<section class="profile-section">
                 <h2 class="profile-section-title">Biographie</h2>
                 <p class="profile-text">${escapeHtml(c.bio)}</p>
               </section>`
            : ""
        }

        ${
          c.project_desc
            ? `<section class="profile-section profile-project">
                 <h2 class="profile-section-title">Projet d'impact</h2>
                 <p class="profile-text">${escapeHtml(c.project_desc)}</p>
               </section>`
            : `<section class="profile-section">
                 <h2 class="profile-section-title">Projet d'impact</h2>
                 <p class="profile-empty">Le projet de ce/cette candidat(e) sera publié prochainement.</p>
               </section>`
        }

        ${videoHtml}
        ${galleryHtml}
      </div>
    </article>`;

  // Barre de vote collante
  document.getElementById("vote-bar-name").textContent = c.name;
  document.getElementById("vote-bar-sub").textContent =
    (c.candidacy_number ? `N° ${c.candidacy_number} · ` : "") + c.category;
  const barBtn = document.getElementById("vote-bar-btn");
  barBtn.href = `/candidats.html?vote=${c.id}`;
  barBtn.textContent = `Voter pour ${firstName}`;
  voteBar.hidden = false;
  document.body.classList.add("has-vote-bar");

  // Titre de l'onglet adapte a la fiche
  document.title = `${c.name} — Miss & Mister Flash Adjarra`;

  // Partage
  document.getElementById("copy-link-btn").addEventListener("click", () => copyToClipboard(link));
  document.getElementById("share-whatsapp-btn").addEventListener("click", () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener");
  });
  document.getElementById("share-btn").addEventListener("click", async () => {
    // Partage natif du telephone si disponible, sinon repli sur la copie
    if (navigator.share) {
      try {
        await navigator.share({ title: c.name, text: shareText, url: link });
        return;
      } catch (e) {
        if (e && e.name === "AbortError") return;
      }
    }
    copyToClipboard(link);
  });

  // Galerie plein ecran
  document.querySelectorAll(".gallery-item").forEach((btn) => {
    btn.addEventListener("click", () => openLightbox(btn.dataset.src, c.name));
  });
}

function feedback(message, isError) {
  const el = document.getElementById("share-feedback");
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("is-error", !!isError);
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Repli pour les navigateurs sans API Clipboard (ou hors HTTPS)
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    feedback("Lien copié. Partagez-le pour récolter des votes.", false);
  } catch (e) {
    feedback("Copie automatique impossible. Lien : " + text, true);
  }
}

/* --- Visionneuse d'image --- */
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");

function openLightbox(src, alt) {
  lightboxImg.src = src;
  lightboxImg.alt = alt || "";
  lightbox.hidden = false;
  document.body.classList.add("nav-open");
}
function closeLightbox() {
  lightbox.hidden = true;
  lightboxImg.removeAttribute("src");
  document.body.classList.remove("nav-open");
}
document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
});

loadProfile();
