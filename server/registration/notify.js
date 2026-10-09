const { pool } = require("../db");

// Architecture de notification extensible. AUCUN service d'envoi n'est
// configure par defaut : les notifications sont alors enregistrees avec le
// statut "skipped" et le site n'affirme jamais qu'un courriel est parti.
// Pour brancher un service plus tard : renseigner MAIL_PROVIDER et implementer
// le transport correspondant dans PROVIDERS ci-dessous.
const PROVIDERS = {
  // exemple : smtp: async ({ to, subject, text }) => { ... }
};

function providerName() {
  const p = (process.env.MAIL_PROVIDER || "").trim().toLowerCase();
  return PROVIDERS[p] ? p : "";
}

// Ne leve jamais d'exception : une panne de notification ne doit pas
// faire perdre une candidature deja enregistree.
async function enqueue(kind, applicationId, recipient) {
  try {
    const provider = providerName();
    const status = provider && recipient ? "pending" : "skipped";
    const err = provider ? (recipient ? "" : "aucun destinataire") : "aucun service d'envoi configuré";
    await pool.query(
      `INSERT INTO registration_notifications (application_id, kind, recipient, status, last_error)
       VALUES ($1, $2, $3, $4, $5)`,
      [applicationId, kind, recipient || "", status, err]
    );
    return status === "pending";
  } catch (e) {
    console.error("[registration] notification non enregistree :", e.message);
    return false;
  }
}

module.exports = { enqueue, providerName };
