/* ============================================================
   Page « J'y serai » — 100 % cote navigateur, aucune ecriture serveur.
   - lit la date et le libelle de l'echeance (/api/settings/countdown) ;
   - propose un fichier agenda (.ics) et une invitation WhatsApp ;
   - dessine une carte partageable (canvas) avec le prenom du visiteur.
   ============================================================ */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var label = "Miss & Mister Flash Adjarra";
  var edition = "Édition 2027";
  var target = null; // Date
  var logo = new Image();
  var logoReady = false;
  logo.onload = function () { logoReady = true; draw(); };
  logo.src = "/img/logo.png";

  function fmtLong(d) {
    try {
      return d.toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) { return d.toString(); }
  }
  function fmtDay(d) {
    try { return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return ""; }
  }

  // ---- donnees publiques existantes ----
  Promise.all([
    fetch("/api/settings/countdown").then(function (r) { return r.json(); }).catch(function () { return {}; }),
    fetch("/api/homepage").then(function (r) { return r.json(); }).catch(function () { return {}; }),
  ]).then(function (res) {
    var cd = res[0] || {};
    var home = res[1] || {};
    if (home.hero_edition) edition = home.hero_edition;
    if (cd.countdown_label) $("iy-label").textContent = cd.countdown_label;
    var t = cd.countdown_target ? new Date(cd.countdown_target) : null;
    if (t && !isNaN(t.getTime())) {
      target = t;
      $("iy-when").textContent = fmtLong(t);
    } else {
      $("iy-when").textContent = "Date à annoncer prochainement";
      $("iy-ics").disabled = true;
      $("iy-hint").textContent = "L'ajout à l'agenda sera disponible dès que l'organisation aura publié la date.";
    }
    var msg = "J'y serai ! " + label + " — " + edition + (target ? ", " + fmtDay(target) : "") + ". Rejoins-moi : " + window.location.origin;
    $("iy-wa").href = "https://wa.me/?text=" + encodeURIComponent(msg);
    draw();
  });

  // ---- fichier agenda ----
  function icsDate(d) {
    return d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, "0") + String(d.getUTCDate()).padStart(2, "0") +
      "T" + String(d.getUTCHours()).padStart(2, "0") + String(d.getUTCMinutes()).padStart(2, "0") + String(d.getUTCSeconds()).padStart(2, "0") + "Z";
  }
  function icsText(s) { return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
  $("iy-ics").addEventListener("click", function () {
    if (!target) return;
    var end = new Date(target.getTime() + 3 * 3600 * 1000);
    var title = ($("iy-label").textContent || "Rendez-vous") + " — " + label;
    var lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Miss & Mister Flash Adjarra//FR", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
      "UID:mmfa-" + target.getTime() + "@" + window.location.hostname,
      "DTSTAMP:" + icsDate(new Date()), "DTSTART:" + icsDate(target), "DTEND:" + icsDate(end),
      "SUMMARY:" + icsText(title), "DESCRIPTION:" + icsText(label + " — " + edition + "\n" + window.location.origin),
      "END:VEVENT", "END:VCALENDAR",
    ];
    var blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "miss-mister-flash-adjarra.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  });

  // ---- carte partageable ----
  var canvas = $("iy-canvas");
  var ctx = canvas.getContext("2d");
  var SERIF = '"Bodoni Moda", "Didot", Georgia, serif';

  function archPath(x, y, w, h) {
    var r = w / 2;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, 0, false);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  }
  function fitText(text, maxW, size, style) {
    var s = size;
    do { ctx.font = style.replace("{s}", s); s -= 4; } while (ctx.measureText(text).width > maxW && s > 36);
  }

  function draw() {
    var W = canvas.width, H = canvas.height;
    var name = $("iy-name").value.trim();
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#fffdf6"); bg.addColorStop(1, "#f3e7c6");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // double cadre or
    ctx.strokeStyle = "#d9a514"; ctx.lineWidth = 3; ctx.strokeRect(44, 44, W - 88, H - 88);
    ctx.lineWidth = 1; ctx.strokeRect(62, 62, W - 124, H - 124);

    // arche + logo
    var aw = 520, ah = 600, ax = (W - aw) / 2, ay = 120;
    archPath(ax, ay, aw, ah);
    ctx.fillStyle = "#ffffff"; ctx.fill();
    ctx.strokeStyle = "#d9a514"; ctx.lineWidth = 3; ctx.stroke();
    if (logoReady) {
      var maxW = aw * 0.72, maxH = ah * 0.7;
      var k = Math.min(maxW / logo.width, maxH / logo.height);
      var lw = logo.width * k, lh = logo.height * k;
      ctx.drawImage(logo, (W - lw) / 2, ay + (ah - lh) / 2 + 30, lw, lh);
    }

    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#211a0c";
    fitText("J'y serai", W - 220, 150, "italic 500 {s}px " + SERIF);
    ctx.fillText("J'y serai", W / 2, 880);

    if (name) {
      ctx.fillStyle = "#7a5600";
      fitText(name, W - 240, 76, "500 {s}px " + SERIF);
      ctx.fillText(name, W / 2, 970);
    }
    ctx.fillStyle = "#211a0c";
    ctx.font = "600 38px " + SERIF;
    ctx.fillText(label, W / 2, 1080);
    ctx.fillStyle = "#6a5f46";
    ctx.font = "400 34px system-ui, sans-serif";
    ctx.fillText(edition + (target ? "  —  " + fmtDay(target) : ""), W / 2, 1136);
    ctx.fillStyle = "#7a5600";
    ctx.font = "400 28px system-ui, sans-serif";
    ctx.fillText(window.location.host, W / 2, 1232);
  }

  // la police Bodoni peut arriver apres le premier dessin : on redessine
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('italic 500 120px "Bodoni Moda"'),
      document.fonts.load('500 60px "Bodoni Moda"'),
    ]).then(draw).catch(function () {});
  }
  $("iy-name").addEventListener("input", draw);
  draw();

  function fb(msg) { $("iy-feedback").textContent = msg; }
  function toBlob() {
    return new Promise(function (resolve) { canvas.toBlob(resolve, "image/png"); });
  }
  $("iy-download").addEventListener("click", function () {
    toBlob().then(function (blob) {
      if (!blob) return fb("Impossible de créer l'image sur cet appareil.");
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "j-y-serai-miss-mister-flash-adjarra.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      fb("Carte téléchargée. Partagez-la sur vos réseaux !");
    });
  });
  $("iy-share").addEventListener("click", function () {
    toBlob().then(function (blob) {
      if (!blob) return fb("Impossible de créer l'image sur cet appareil.");
      var file = new File([blob], "j-y-serai.png", { type: "image/png" });
      var text = "J'y serai ! " + label + " — " + edition;
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], text: text, url: window.location.origin }).catch(function () {});
      } else if (navigator.share) {
        navigator.share({ text: text, url: window.location.origin }).catch(function () {});
      } else {
        fb("Le partage direct n'est pas disponible ici : utilisez « Télécharger ma carte ».");
      }
    });
  });
})();
