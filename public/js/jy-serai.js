// Page « J'y serai » : compte à rebours, ajout à l'agenda (.ics généré dans le navigateur)
// et partage WhatsApp. Aucune donnée n'est envoyée ni enregistrée côté serveur.
let target = null;
let label = "Soirée de gala";
const msg = document.getElementById("save-msg");

function tick() {
  if (target === null) return;
  let diff = Math.max(0, target - Date.now());
  const d = Math.floor(diff / 86400000); diff -= d * 86400000;
  const h = Math.floor(diff / 3600000); diff -= h * 3600000;
  const m = Math.floor(diff / 60000); diff -= m * 60000;
  const s = Math.floor(diff / 1000);
  document.getElementById("cd-days").textContent = d;
  document.getElementById("cd-hours").textContent = String(h).padStart(2, "0");
  document.getElementById("cd-min").textContent = String(m).padStart(2, "0");
  document.getElementById("cd-sec").textContent = String(s).padStart(2, "0");
}

async function init() {
  const labelEl = document.getElementById("countdown-label");
  const grid = document.getElementById("countdown-grid");
  const empty = document.getElementById("countdown-empty");
  try {
    const data = await (await fetch("/api/settings/countdown")).json();
    label = data.countdown_label || label;
    labelEl.textContent = label;
    const t = data.countdown_target ? new Date(data.countdown_target).getTime() : NaN;
    if (isNaN(t)) {
      empty.style.display = "block";
      return;
    }
    target = t;
    grid.style.display = "flex";
    tick();
    setInterval(tick, 1000);
  } catch (e) {
    labelEl.textContent = label;
    empty.style.display = "block";
  }
}

function pad(n) { return String(n).padStart(2, "0"); }
function icsDate(d) {
  return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "T" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + "00Z";
}

document.getElementById("save-ics").addEventListener("click", () => {
  if (target === null) {
    msg.textContent = "La date n'est pas encore annoncée : revenez dès qu'elle est publiée.";
    return;
  }
  const start = new Date(target);
  const end = new Date(target + 3 * 3600000);
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Miss et Mister Flash Adjarra//FR", "BEGIN:VEVENT",
    "UID:" + start.getTime() + "@missmisterflashadjarra",
    "DTSTAMP:" + icsDate(new Date()),
    "DTSTART:" + icsDate(start),
    "DTEND:" + icsDate(end),
    "SUMMARY:Miss & Mister Flash Adjarra - " + label,
    "DESCRIPTION:Soirée de gala Miss & Mister Flash Adjarra. Détails sur " + location.origin,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "miss-mister-flash-adjarra.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  msg.textContent = "Fichier d'agenda téléchargé.";
});

document.getElementById("save-wa").addEventListener("click", () => {
  const text = "J'y serai ! Soirée de gala Miss & Mister Flash Adjarra. Rejoins-moi : " + location.origin + "/jy-serai.html";
  window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener");
});

init();
