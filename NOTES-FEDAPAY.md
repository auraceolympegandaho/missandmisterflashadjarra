# Brancher FedaPay — pas à pas

1. **Compte** : créez/validez votre compte sur https://fedapay.com. Testez d'abord en **sandbox**.
2. **Clés** : Tableau de bord FedaPay > Développeurs > Clés API → copiez la clé secrète (`sk_sandbox_…`, puis `sk_live_…` en production).
3. **Variables Render** (Dashboard > votre service > Environment) :
   - `FEDAPAY_SECRET_KEY` = la clé secrète
   - `FEDAPAY_ENV` = `sandbox` (puis `live`)
   - `PUBLIC_URL` = l'URL exacte du site, ex. `https://votre-site.onrender.com` (sans `/` final)
   - `PRICE_PER_VOTE` = 100 (modifiable aussi dans l'admin)
4. **Webhook** : FedaPay > Webhooks > Ajouter
   - URL : `https://votre-site.onrender.com/api/votes/webhook`
   - Événements : `transaction.approved`, `transaction.declined`, `transaction.canceled`
   - Copiez le secret du webhook dans `FEDAPAY_WEBHOOK_SECRET` (obligatoire en `live` : sans lui, les webhooks sont refusés).
5. **Test** : un vote de test en sandbox → paiement → page « merci » doit afficher « Paiement confirmé » et le compteur du candidat augmente.
6. **Production** : remplacez la clé par la clé live, passez `FEDAPAY_ENV=live`, mettez à jour le secret du webhook (live), redéployez.

Sécurité ajoutée : les votes ne sont crédités qu'une fois (idempotent) ; si le webhook tarde, la page « merci » interroge directement FedaPay pour confirmer.
