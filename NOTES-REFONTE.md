# Refonte visuelle — « Programme de gala »

Périmètre : **uniquement `public/`**. Le dossier `server/` est strictement identique à l'original
(base de données, authentification, votes, FedaPay, inscriptions : aucune ligne modifiée).

## Direction artistique
- Papier ivoire, filets d'or, blanc ; une section sombre (« nuit dorée ») par page au maximum.
- Titres en Bodoni Moda, texte en Instrument Sans (Google Fonts, repli Didot/Georgia puis sans-serif système).
- Motif unique : l'**arche** (affiche, portraits, fiche, classement) ; le billet à talon pour le compte à rebours et la billetterie.

## Navigation
- ≥ 1180 px : rail latéral fixe, liens regroupés (Le concours / Participer / Aide).
- < 1180 px : barre compacte (marque, Voter, Menu) + panneau plein écran.
- Pied de page « colophon » (grand nom en contour, 4 colonnes, coordonnées issues de /api/contact).
- Pour ajouter une page : modifier `GROUPS` en haut de `public/js/nav.js`.

## Fichiers CSS
| Nouveau | Rôle |
|---|---|
| `css/mm.css` | jetons, base, navigation, boutons, formulaires, modale de vote, pied de page |
| `css/mm-pages.css` | accueil et toutes les pages publiques (y compris module d'inscription `.reg-*`) |
| `css/mm-admin.css` | administration |

Les anciennes feuilles (style, nav, home, theme, premium, light, pages, profile, candidates,
galerie, resultats, registration, admin, admin-registrations) sont remplacées.

## Ajouts front uniquement (aucune écriture serveur)
- Accueil : « Prochaines étapes » (via `/api/about`), candidats à la une et extraits de projets (via `/api/candidates`).
- Page **J'y serai** (`j-y-serai.html`) : agenda .ics, invitation WhatsApp, carte partageable (canvas).
- Tableau de bord admin : votes totaux, nombre de candidats, barres Miss/Mister (calculés depuis `/api/admin/results`).

## Administration
Barre latérale sombre en 4 rubriques, titre de section dynamique, tiroir sur mobile (`admin-shell.js`).
Tous les identifiants HTML utilisés par `admin.js` et `admin-registrations.js` sont conservés.
