// Page Contact : prepare le message et l'ouvre dans WhatsApp ou dans la
// messagerie du visiteur. Aucun envoi serveur, donc rien a maintenir cote back.
const CONTACT_WHATSAPP = "22900000000"; // a remplacer par le numero officiel (format international, sans +)
const CONTACT_EMAIL = "contact@missmisterflashadjarra.bj"; // a remplacer par l'adresse officielle

const feedbackEl = document.getElementById("contact-feedback");

function displayPhone(num) {
  return "+" + num.replace(/(\d{3})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5");
}

document.getElementById("contact-whatsapp").href = `https://wa.me/${CONTACT_WHATSAPP}`;
document.getElementById("contact-whatsapp-label").textContent = displayPhone(CONTACT_WHATSAPP);
document.getElementById("contact-email").href = `mailto:${CONTACT_EMAIL}`;
document.getElementById("contact-email-label").textContent = CONTACT_EMAIL;

function buildMessage() {
  const name = document.getElementById("contact-name").value.trim();
  const subject = document.getElementById("contact-subject").value;
  const message = document.getElementById("contact-message").value.trim();

  if (!message) {
    feedbackEl.textContent = "Écrivez d'abord votre message.";
    feedbackEl.style.color = "var(--danger)";
    document.getElementById("contact-message").focus();
    return null;
  }
  feedbackEl.textContent = "";
  feedbackEl.style.color = "";
  return {
    subject: `${subject} — Miss & Mister Flash Adjarra`,
    body: `${message}${name ? `\n\n— ${name}` : ""}`,
  };
}

document.getElementById("send-whatsapp").addEventListener("click", () => {
  const m = buildMessage();
  if (!m) return;
  window.open(
    `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(`[${m.subject}]\n\n${m.body}`)}`,
    "_blank",
    "noopener"
  );
});

document.getElementById("send-email").addEventListener("click", () => {
  const m = buildMessage();
  if (!m) return;
  window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    m.subject
  )}&body=${encodeURIComponent(m.body)}`;
});
