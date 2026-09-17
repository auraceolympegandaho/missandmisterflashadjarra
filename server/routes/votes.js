const express = require("express");
const { pool } = require("../db");
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

    const candidateResult = await pool.query(
      "SELECT * FROM candidates WHERE id = $1 AND is_active = 1",
      [candidateId]
    );
    const candidate = candidateResult.rows[0];
    if (!candidate) return res.status(404).json({ error: "Candidat introuvable." });

    const priceRow = await pool.query("SELECT value FROM settings WHERE key = 'price_per_vote'");
    const pricePerVote = Number(priceRow.rows[0].value);
    const amount = pricePerVote * nb;

    const insert = await pool.query(
      `INSERT INTO transactions (candidate_id, votes_bought, amount_fcfa, voter_phone, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
      [candidateId, nb, amount, phone || ""]
    );
    const txId = insert.rows[0].id;

    const { transactionId, paymentUrl } = await fedapay.createPayment({
      amount,
      description: `${nb} vote(s) pour ${candidate.name} - Miss & Mister Flash Adjarra`,
      customerPhone: phone,
      callbackUrl: `${process.env.PUBLIC_URL}/merci.html?tx=${txId}`,
      metadata: { local_transaction_id: txId, candidate_id: candidateId },
    });

    await pool.query("UPDATE transactions SET fedapay_transaction_id = $1 WHERE id = $2", [
      transactionId,
      txId,
    ]);

    res.json({ paymentUrl, localTransactionId: txId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible d'initier le paiement pour le moment." });
  }
});

// GET /api/votes/status/:localTransactionId -> pour que la page "merci" affiche le bon message
router.get("/status/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM transactions WHERE id = $1", [req.params.id]);
    const tx = result.rows[0];
    if (!tx) return res.status(404).json({ error: "Transaction introuvable." });
    res.json({ status: tx.status, votes_bought: tx.votes_bought, candidate_id: tx.candidate_id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
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

    const client = await pool.connect();
    try {
      const localResult = await client.query(
        "SELECT * FROM transactions WHERE fedapay_transaction_id = $1",
        [String(fedapayTxId)]
      );
      const localTx = localResult.rows[0];
      if (!localTx) {
        client.release();
        return res.status(200).send("ok");
      }

      // Idempotence : si deja approuve, ne pas re-crediter les votes
      if (localTx.status === "approved") {
        client.release();
        return res.status(200).send("ok");
      }

      const newStatus = ["approved", "declined", "canceled"].includes(status)
        ? status
        : "pending";

      await client.query("BEGIN");
      await client.query(
        "UPDATE transactions SET status = $1, updated_at = now() WHERE id = $2",
        [newStatus, localTx.id]
      );
      if (newStatus === "approved") {
        await client.query(
          "UPDATE candidates SET votes_count = votes_count + $1 WHERE id = $2",
          [localTx.votes_bought, localTx.candidate_id]
        );
      }
      await client.query("COMMIT");

      res.status(200).send("ok");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(err);
      res.status(500).send("Erreur serveur.");
    } finally {
      client.release();
    }
  }
);

module.exports = router;
