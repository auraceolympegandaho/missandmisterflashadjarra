// Page Contact : coordonnees et sujets charges depuis /api/contact (geres
// dans l'admin). Le message est prepare puis ouvert dans WhatsApp ou la
// messagerie du visiteur ; il n'y a aucun envoi cote serveur.
const feedbackEl = document.getElementById("contact-feedback");
let CONTACT = { whatsapp: "", email: "", address: "", subjects: [] };

function displayPhone(num) {
  const digits = String(num || "").replace(/\D/g, "");
  if (digits.length < 8) return num || "";
  return "+" + digits.replace(/(\d{3})(\d{2})(\d{2})(\d{2})(\d{2,})/, "$1 $2 $3 $4 $5");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

async function loadContact() {
  try {
    const res = await fetch("/api/contact");
    if (!res.ok) throw new Error("http");
    CONTACT = await res.json();
  } catch (e) {
    feedbackEl.textContent = "Les coordonnées n'ont pas pu être chargées. Réessayez plus tard.";
    feedbackEl.style.color = "var(--danger)";
    return;
  }

  document.getElementById("contact-whatsapp").href = `https://wa.me/${CONTACT.whatsapp}`;
  document.getElementById("contact-whatsapp-label").textContent = displayPhone(CONTACT.whatsapp);
  document.getElementById("contact-email").href = `mailto:${CONTACT.email}`;
  document.getElementById("contact-email-label").textContent = CONTACT.email;
  document.getElementById("contact-address").textContent =
    CONTACT.address || "Adresse à venir.";

  const select = document.getElementById("contact-subject");
  const subjects = Array.isArray(CONTACT.subjects) && CONTACT.subjects.length
    ? CONTACT.subjects
    : ["Question générale"];
  select.innerHTML = subjects.map((s) => `<option>${escapeHtml(s)}</option>`).join("");
}

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
  if (!CONTACT.whatsapp) return;
  const m = buildMessage();
  if (!m) return;
  window.open(
    `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(`[${m.subject}]\n\n${m.body}`)}`,
    "_blank",
    "noopener"
  );
});

document.getElementById("send-email").addEventListener("click", () => {
  if (!CONTACT.email) return;
  const m = buildMessage();
  if (!m) return;
  window.location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(
    m.subject
  )}&body=${encodeURIComponent(m.body)}`;
});

loadContact();
