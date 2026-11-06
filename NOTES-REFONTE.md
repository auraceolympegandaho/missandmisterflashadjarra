# Refonte « Atelier » — architecture visuelle

Aucune modification du serveur, de la base de données, de l'authentification, des
inscriptions, des votes ni des routes API. La refonte ne touche que `public/`.

## Direction artistique
- Palette : ivoire `#fbf7ee`, blanc, crème `#f3ead5`, or `#b8892b` / `#dcb65e`, encre brune `#2b2113`.
- Typographies : Bodoni Moda (titres), Hanken Grotesk (texte) — chargées depuis Google Fonts, avec polices de secours.
- Motifs de la marque : **l'arche** (cadre de tous les portraits), **le filet doré**, **le billet à perforations** (billetterie).

## Feuilles de style (remplacent les 14 anciennes feuilles)
| Fichier | Rôle |
|---|---|
| `css/atelier-core.css` | Jetons (couleurs, polices), base, boutons, champs, fenêtres modales |
| `css/atelier.css` | Toutes les pages publiques |
| `css/atelier-admin.css` | Administration |

Les anciennes feuilles (`style`, `nav`, `home`, `theme`, `premium`, `light`, `pages`, `profile`,
`candidates`, `galerie`, `resultats`, `registration`, `admin`, `admin-registrations`) ne sont plus
référencées et ont été retirées ; elles restent disponibles dans l'archive d'origine.

## Navigation
`js/nav.js` génère : barre compacte (marque, 4 accès rapides, bouton Voter), menu plein écran
regroupé par intention (Le concours / Voter et suivre / Candidater / Aide), barre d'onglets flottante
sur téléphone, et le pied de page éditorial. Pour ajouter une page : modifier `GROUPS` en haut de `nav.js`.

## Pages
- Accueil : ouverture en arche, bandeau « prochaines étapes » (compte à rebours + calendrier),
  rail de candidats, objectifs, actualité à la une, projets d'impact, partenaires, appel final.
  L'aperçu des candidats et des projets lit `/api/candidates` (lecture seule, mêmes règles d'affichage des votes).
- Nouvelle page **J'y serai** (`jy-serai.html`) : compte à rebours, ajout à l'agenda (.ics généré
  dans le navigateur), partage WhatsApp. Elle n'enregistre aucune donnée (une liste de participants
  exigerait une table en base : non faite).
- Toutes les autres pages publiques ont une mise en page propre (voir `public/*.html`) ; les identifiants
  et classes utilisés par les scripts sont conservés.

## Administration
Barre latérale groupée (Pilotage / Concours / Contenu du site / Système) sur ordinateur, barre
d'onglets défilante sur téléphone. Les identifiants `data-tab`, `tab-*` et tous les champs sont inchangés.
