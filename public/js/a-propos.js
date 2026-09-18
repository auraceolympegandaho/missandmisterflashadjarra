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

loadAbout();
