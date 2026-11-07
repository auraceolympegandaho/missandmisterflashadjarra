# URL propres et redirections 301

Hébergement : Render (Node/Express). Toute la logique est dans `server/urls.js`,
branchée dans `server/server.js` **avant** `express.static`. Aucun `.htaccess` /
`_redirects` : ils seraient ignorés par cet hébergement.

## Règles
| Ancienne URL | Nouvelle URL | Comportement |
|---|---|---|
| `/index.html`, `/index` | `/` | 301 |
| `/<page>.html` | `/<page>` | 301 |
| `/<page>/` , `/Page` | `/<page>` | 301 (pas de doublons) |
| `/<page>` | — | page servie directement (accès direct et F5 OK) |

- La query string est conservée : `/candidat.html?id=7` → `/candidat?id=7`,
  `/candidats.html?vote=12` → `/candidats?vote=12`, `/merci.html?tx=5` → `/merci?tx=5`.
- Les ancres (`#presentation-candidats`, `#objectifs`) sont conservées par le navigateur
  lors d'une redirection 301 (le fragment n'est jamais envoyé au serveur).
- Seules les requêtes GET/HEAD sont concernées : `/api/*`, `/css`, `/js`, `/img`,
  les POST (votes, inscriptions, admin) et le webhook FedaPay ne sont pas touchés.
- L'adresse de redirection est reconstruite depuis une liste blanche de pages
  (aucune redirection ouverte possible).

## Routes (auto-découvertes depuis `public/*.html`)
`/` · `/candidats` · `/candidat?id=` · `/profil?id=` · `/inscriptions` ·
`/inscription-formulaire` · `/inscription-conditions` · `/inscription-suivi` ·
`/billetterie` · `/projets` · `/galerie` · `/resultats` · `/a-propos` ·
`/partenaires` · `/faq` · `/contact` · `/merci` · `/admin`

**Ajouter une page** = déposer `public/ma-page.html` : `/ma-page` existe automatiquement.

## Liens enregistrés en base
Les boutons de l'accueil (éditables en admin) enregistrés avant cette opération peuvent
contenir `/candidats.html`. `/api/homepage` et `/api/admin/homepage` les convertissent à
la volée (`cleanInternalUrl`) ; ils sont réécrits proprement à la prochaine sauvegarde
en admin. Même sans cela, l'ancienne adresse reste redirigée en 301.

## Déploiement
1. Redéployer sur Render (aucune nouvelle dépendance, aucune migration).
2. Vérifier `PUBLIC_URL` (sans slash final, ex. `https://votre-domaine.com`) :
   il sert à la redirection après paiement FedaPay (`/merci?tx=…`).
3. Les paiements lancés AVANT le déploiement renvoient vers `/merci.html?tx=…` :
   ils sont redirigés en 301 vers `/merci?tx=…` (aucun vote perdu).
4. Les 301 sont mis en cache durablement par les navigateurs : retour arrière
   difficile une fois en production (voir ci-dessous si besoin).
5. Si le site est derrière un CDN/proxy (Cloudflare…), purger le cache après déploiement.
6. Search Console : soumettre le sitemap/réindexer l'accueil ; les 301 transfèrent le
   référencement des anciennes adresses.

## Non applicable à ce projet
- Aucun fichier `.php` n'existe (stack Node) : rien à masquer.
- Les pages `/connexion`, `/presentation`, `/actualites` citées en exemple n'existent pas
  dans le site ; aucune page n'a été créée (hors périmètre « sans modification du contenu »).
  L'interface d'administration est servie sur `/admin` (connexion intégrée à cette page).
