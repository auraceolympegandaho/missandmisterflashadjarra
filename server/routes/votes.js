const express = require("express");
const db = require("../db");
const fedapay = require("../payments/fedapay");

const router = express.Router();

// POST /api/votes/init
// body: { candidateId, votesCount, phone }
// -> cree une transaction "pending" + une transaction FedaPay, renvoie l'URL de paiement
router.post("/init", async (req, res) => {
  try {
    const { candidateId, votesCount, phone } = req.body;
    const nb = Number(votesCount);

    if (!candidateId || !nb || nb < 1) {
      return res.status(400).json({ error: "Candidat et nombre de votes requis (minimum 1)." });
    }

    const candidate = db
      .prepare("SELECT * FROM candidates WHERE id = ? AND is_active = 1")
      .get(candidateId);
    if (!candidate) return res.status(404).json({ error: "Candidat introuvable." });

    const priceRow = db.prepare("SELECT value FROM settings WHERE key = 'price_per_vote'").get();
    const pricePerVote = Number(priceRow.value);
    const amount = pricePerVote * nb;

    const insert = db
      .prepare(
        `INSERT INTO transactions (candidate_id, votes_bought, amount_fcfa, voter_phone, status)
         VALUES (?, ?, ?, ?, 'pending')`
      )
      .run(candidateId, nb, amount, phone || "");
    const txId = insert.lastInsertRowid;

    const { transactionId, paymentUrl } = await fedapay.createPayment({
      amount,
      description: `${nb} vote(s) pour ${candidate.name} - Miss & Mister Flash Adjarra`,
      customerPhone: phone,
      callbackUrl: `${process.env.PUBLIC_URL}/merci.html?tx=${txId}`,
      metadata: { local_transaction_id: txId, candidate_id: candidateId },
    });

    db.prepare("UPDATE transactions SET fedapay_transaction_id = ? WHERE id = ?").run(
      transactionId,
      txId
    );

    res.json({ paymentUrl, localTransactionId: txId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible d'initier le paiement pour le moment." });
  }
});

// GET /api/votes/status/:localTransactionId -> pour que la page "merci" affiche le bon message
router.get("/status/:id", (req, res) => {
  const tx = db.prepare("SELECT * FROM transactions WHERE id = ?").get(req.params.id);
  if (!tx) return res.status(404).json({ error: "Transaction introuvable." });
  res.json({ status: tx.status, votes_bought: tx.votes_bought, candidate_id: tx.candidate_id });
});

// POST /api/votes/webhook -> appelee par FedaPay quand le paiement change de statut.
// A configurer dans le tableau de bord FedaPay : URL = https://votredomaine.com/api/votes/webhook
router.post(
  "/webhook",
  express.raw({ type: "*/*" }), // on a besoin du corps brut pour verifier la signature
  async (req, res) => {
    const signature = req.headers["x-fedapay-signature"];
    const rawBody = req.body.toString("utf8");

    if (!fedapay.verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).send("Signature invalide.");
    }

    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return res.status(400).send("Corps invalide.");
    }

    const entity = event.entity || {};
    const fedapayTxId = entity.id;
    const status = entity.status; // approved | declined | canceled | pending

    if (!fedapayTxId) return res.status(200).send("ok"); // rien a faire

    const localTx = db
      .prepare("SELECT * FROM transactions WHERE fedapay_transaction_id = ?")
      .get(String(fedapayTxId));

    if (!localTx) return res.status(200).send("ok");

    // Idempotence : si deja approuve, ne pas re-crediter les votes
    if (localTx.status === "approved") return res.status(200).send("ok");

    const newStatus = ["approved", "declined", "canceled"].includes(status) ? status : "pending";

    const updateTx = db.transaction(() => {
      db.prepare("UPDATE transactions SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
        newStatus,
        localTx.id
      );
      if (newStatus === "approved") {
        db.prepare("UPDATE candidates SET votes_count = votes_count + ? WHERE id = ?").run(
          localTx.votes_bought,
          localTx.candidate_id
        );
      }
    });
    updateTx();

    res.status(200).send("ok");
  }
);

module.exports = router;
