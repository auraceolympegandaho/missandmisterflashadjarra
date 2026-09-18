// Page A propos : reprend le texte de presentation et les objectifs
// definis dans l'administration (meme source que la page d'accueil).
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

async function loadAbout() {
  try {
    const res = await fetch("/api/homepage");
    if (!res.ok) return;
    const data = await res.json();

    if (data.hero_description) {
      document.getElementById("about-description").textContent = data.hero_description;
    }
    if (data.organizer_text) {
      // Ce texte est saisi par l'organisation et peut contenir une mise en forme simple.
      document.getElementById("about-organizer").innerHTML = data.organizer_text;
    }
    if (Array.isArray(data.objectives) && data.objectives.length) {
      document.getElementById("about-objectives").innerHTML = data.objectives
        .map((o) => `<li><b>${escapeHtml(o.title)} :</b> ${escapeHtml(o.text)}</li>`)
        .join("");
    }
  } catch (e) {
    // En cas d'echec, les textes par defaut deja presents dans la page restent affiches.
    console.error("Contenu 'à propos' indisponible", e);
  }
}

// Contenu propre a la page A propos (deroulement, projet, transparence)
async function loadAboutContent() {
  try {
    const res = await fetch("/api/about");
    if (!res.ok) return;
    const data = await res.json();

    if (Array.isArray(data.steps) && data.steps.length) {
      document.getElementById("about-steps").innerHTML = data.steps
        .map((s) => `<li><b>${escapeHtml(s.title)}.</b> ${escapeHtml(s.text)}</li>`)
        .join("");
    }
    if (data.project_text) {
      document.getElementById("about-project-text").textContent = data.project_text;
    }
    if (data.transparency_text) {
      document.getElementById("about-transparency-text").textContent = data.transparency_text;
    }
  } catch (e) {
    console.error("Contenu 'A propos' (deroulement/projet/transparence) indisponible", e);
  }
}

loadAbout();
loadAboutContent();
