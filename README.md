# Miss & Mister Flash Adjarra — Site de vote en ligne

Site complet de vote payant pour concours de beauté : galerie de candidat(e)s,
vote par Mobile Money / carte bancaire (via FedaPay), et panel admin pour
gérer les candidats et suivre les résultats en temps réel.

## Structure du projet

```
miss-mister-vote/
├── server/              Backend Node.js/Express + base SQLite
│   ├── server.js        Point d'entrée
│   ├── db.js            Schéma et connexion base de données
│   ├── routes/
│   │   ├── candidates.js   Liste publique des candidats
│   │   ├── votes.js        Initiation de paiement + webhook FedaPay
│   │   └── admin.js        Login admin, CRUD candidats, résultats
│   ├── payments/fedapay.js Intégration FedaPay
│   └── .env.example     Modèle de configuration
└── public/               Frontend (HTML/CSS/JS, pas de build requis)
    ├── index.html        Site public (galerie + vote)
    ├── admin.html         Panel admin
    └── merci.html         Page de confirmation après paiement
```

## 1. Installation

Prérequis : Node.js 18+ installé sur votre machine ou votre serveur.

```bash
cd server
npm install
cp .env.example .env
```

Éditez `.env` et remplissez au minimum :
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — vos identifiants du panel admin
- `JWT_SECRET` — une longue chaîne aléatoire (ex: générée avec `openssl rand -hex 32`)
- `PRICE_PER_VOTE` — le prix d'un vote en FCFA

## 2. Configurer le paiement (FedaPay)

FedaPay est un agrégateur béninois qui gère Mobile Money (MTN, Moov) et les
cartes bancaires — idéal pour un concours à Adjarra.

1. Créez un compte sur **https://fedapay.com**
2. Activez votre compte marchand (KYC : pièce d'identité + infos de l'organisation)
3. Dans le tableau de bord : **Développeurs > Clés API**, copiez votre clé secrète
   - Commencez avec la clé **sandbox** pour tester sans vrai argent
   - Passez en clé **live** une fois prêt à encaisser réellement
4. Renseignez `FEDAPAY_SECRET_KEY` et `FEDAPAY_ENV` dans `.env`
5. Dans **Développeurs > Webhooks**, ajoutez une URL :
   `https://VOTRE-DOMAINE.com/api/votes/webhook`
   Copiez le secret de signature généré dans `FEDAPAY_WEBHOOK_SECRET`

> Sans compte FedaPay configuré, le site tourne mais le paiement échouera à
> l'étape `createPayment`. C'est normal en local/test tant que vous n'avez
> pas de vraies clés API.

**Alternative** : si vous préférez un autre agrégateur (KkiaPay, PayDunya,
CinetPay...), seul le fichier `server/payments/fedapay.js` doit être remplacé
— le reste du site (routes, frontend) n'a pas besoin de changer, du moment
que le nouveau module expose les mêmes fonctions `createPayment`,
`verifyWebhookSignature`, `getTransaction`.

## 3. Lancer en local

```bash
cd server
npm start
```

Le site est accessible sur `http://localhost:4000`
Le panel admin sur `http://localhost:4000/admin.html`

## 4. Ajouter vos candidats

1. Allez sur `/admin.html`, connectez-vous
2. Onglet **Candidats** → **+ Ajouter un(e) candidat(e)**
3. Renseignez nom, catégorie (Miss/Mister), bio, photo

## 5. Déployer en production

Options simples et abordables :
- **Render.com** ou **Railway.app** : déploiement direct depuis un dépôt Git,
  gèrent Node.js nativement (le fichier SQLite persiste sur un disque monté)
- **VPS** (Contabo, Hostinger, OVH...) avec Node.js + PM2 pour garder le
  serveur actif : `pm2 start server.js --name miss-mister`
- Pensez à activer **HTTPS** (obligatoire pour FedaPay en production, via
  Let's Encrypt/Certbot ou automatique sur Render/Railway)
- Mettez à jour `PUBLIC_URL` dans `.env` avec votre vrai nom de domaine

## 6. Sécurité — points importants

- Changez `ADMIN_PASSWORD` et `JWT_SECRET` avant toute mise en production
- Ne partagez jamais votre `FEDAPAY_SECRET_KEY`
- Le webhook vérifie la signature FedaPay — ne désactivez pas cette vérification en production
- Sauvegardez régulièrement le fichier `server/data/vote.db` (contient candidats, votes, transactions)

## Notes techniques

- La base de données est **SQLite** (fichier unique, pas de serveur séparé
  à gérer) — largement suffisant pour un concours régional. Si le trafic
  devient très important, on peut migrer vers PostgreSQL sans réécrire la logique.
- Les votes ne sont crédités qu'après confirmation du paiement par le
  **webhook FedaPay** (pas au moment du clic) — évite les votes gratuits en cas d'abandon de paiement.
- Le code du module `fedapay.js` suit la documentation publique FedaPay au
  moment de la rédaction ; vérifiez les noms de champs exacts dans leur
  documentation à jour (https://docs.fedapay.com) avant la mise en production,
  les API de paiement évoluent parfois.
