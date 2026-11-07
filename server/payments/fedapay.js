// Integration FedaPay (Mobile Money MTN/Moov + carte bancaire)
// Documentation officielle : https://docs.fedapay.com
const fetch = require("node-fetch");
const crypto = require("crypto");

const FEDAPAY_ENV = process.env.FEDAPAY_ENV === "live" ? "live" : "sandbox";
const BASE_URL =
  FEDAPAY_ENV === "live" ? "https://api.fedapay.com/v1" : "https://sandbox-api.fedapay.com/v1";

function headers() {
  return {
    Authorization: `Bearer ${process.env.FEDAPAY_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

/**
 * Cree une transaction FedaPay et renvoie l'URL de paiement a laquelle
 * rediriger l'electeur (page hebergee par FedaPay : choix Mobile Money / carte).
 */
async function createPayment({ amount, description, customerPhone, callbackUrl, metadata }) {
  const res = await fetch(`${BASE_URL}/transactions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      description,
      amount,
      currency: { iso: "XOF" },
      callback_url: callbackUrl,
      customer: {
        firstname: "Electeur",
        lastname: "Flash Adjarra",
        phone_number: { number: customerPhone || "", country: "BJ" },
      },
      metadata,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erreur creation transaction FedaPay: ${res.status} ${errText}`);
  }
  const data = await res.json();
  const transactionId = data["v1/transaction"].id;

  // Genere le lien de paiement hebergee (token)
  const tokenRes = await fetch(`${BASE_URL}/transactions/${transactionId}/token`, {
    method: "POST",
    headers: headers(),
  });
  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Erreur generation token FedaPay: ${tokenRes.status} ${errText}`);
  }
  const tokenData = await tokenRes.json();

  return {
    transactionId,
    paymentUrl: tokenData.url,
  };
}

/** Verifie la signature d'un webhook FedaPay pour s'assurer qu'il est authentique. */
function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!process.env.FEDAPAY_WEBHOOK_SECRET) {
    // Sans secret, on n'accepte les webhooks que en sandbox (tests). En "live" : refus.
    return FEDAPAY_ENV !== "live";
  }
  if (!signatureHeader) return false;

  // FedaPay envoie un header type: "t=timestamp,s=signature"
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("=").map((s) => s.trim()))
  );
  const expected = crypto
    .createHmac("sha256", process.env.FEDAPAY_WEBHOOK_SECRET)
    .update(`${parts.t}.${rawBody}`)
    .digest("hex");

  if (!parts.s || expected.length !== parts.s.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.s));
}

/** Recupere le statut a jour d'une transaction directement depuis l'API (verification double). */
async function getTransaction(transactionId) {
  const res = await fetch(`${BASE_URL}/transactions/${transactionId}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Impossible de recuperer la transaction ${transactionId}`);
  const data = await res.json();
  return data["v1/transaction"];
}

/** Verifie au demarrage que la configuration FedaPay est complete. */
function checkConfig() {
  if (!process.env.FEDAPAY_SECRET_KEY) console.warn("[fedapay] FEDAPAY_SECRET_KEY manquante : les paiements sont impossibles.");
  if (!process.env.PUBLIC_URL) console.warn("[fedapay] PUBLIC_URL manquante : la redirection apres paiement sera invalide.");
  if (FEDAPAY_ENV === "live" && !process.env.FEDAPAY_WEBHOOK_SECRET)
    console.warn("[fedapay] FEDAPAY_WEBHOOK_SECRET manquante en mode live : les webhooks seront refuses.");
  console.log(`[fedapay] environnement : ${FEDAPAY_ENV}`);
}

module.exports = { createPayment, verifyWebhookSignature, getTransaction, checkConfig };
