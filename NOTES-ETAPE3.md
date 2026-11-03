# Étape 3 — Fiches publiques des candidats, menu et pages

## 1. Fiche publique d'un(e) candidat(e) — `/candidat.html`

La fiche affiche, dans cet ordre :

- photo principale (avec badges catégorie + numéro de candidature) ;
- nom ;
- filière et année d'étude, présentées comme deux informations étiquetées ;
- nombre de votes et rang dans la catégorie (voir § 3) ;
- bouton de vote principal ;
- boutons **Copier le lien**, **Partager** (partage natif du téléphone) et **WhatsApp** ;
- biographie ;
- projet d'impact (message d'attente si le projet n'est pas encore renseigné) ;
- vidéo de présentation (lecteur intégré pour YouTube, lien externe sinon) ;
- galerie photo, chaque image s'ouvrant en plein écran.

Expérience mobile :

- mise en page pensée pour le petit écran d'abord, photo limitée à 60 % de la hauteur d'écran ;
- barre de vote collante en bas de l'écran : le bouton reste atteignable pendant le défilement ;
- squelette de chargement au lieu d'un écran vide ;
- textes longs qui passent à la ligne au lieu d'être coupés.

Messages clairs :

| Situation | Message |
|---|---|
| Lien sans `id` ou `id` inconnu | « Candidat(e) introuvable » + lien vers la liste |
| Candidat existant mais désactivé | « Profil non disponible » (retiré du concours) |
| Erreur réseau ou serveur | « Connexion impossible » + bouton **Réessayer** |

Côté serveur, `GET /api/candidates/:id` renvoie désormais un champ `reason`
(`not_found` ou `disabled`) qui permet de distinguer ces deux cas.

## 2. Classement

`GET /api/candidates` et `GET /api/candidates/:id` renvoient `rank` (rang dans la
catégorie, ex æquo partagés) et `category_total`. La fiche affiche par exemple
« 3ᵉ sur 12 en Miss ».

## 3. Paramètres publics autorisés

Nouveau réglage `public_display` (onglet **Réglages** de l'administration) :

- *Afficher le nombre de votes*
- *Afficher le classement*

Quand une case est décochée, l'information est retirée **côté serveur** : elle
n'apparaît ni sur les fiches, ni sur la liste des candidats, ni sur la page
Résultats (qui affiche alors un message d'attente). Les votes continuent d'être
enregistrés normalement.

API : `GET /api/settings/public` (public), `GET|PUT /api/admin/settings/public-display` (admin).

## 4. Menu et pages

Le menu est désormais **unique et partagé** : il est généré par `/js/nav.js` et
stylé par `/css/nav.css`. Pour ajouter, retirer ou renommer une page, il suffit de
modifier le tableau `MENU` en haut de `nav.js` — toutes les pages suivent.

Pages du menu :

| Page | Fichier | État |
|---|---|---|
| Accueil | `index.html` | existante |
| Candidats | `candidats.html` | existante |
| Billetterie | `billetterie.html` | **nouvelle** |
| Projets d'impact | `projets.html` | existante (renommée) |
| Galerie | `galerie.html` | existante |
| Résultats | `resultats.html` | existante, conservée dans le menu |
| À propos | `a-propos.html` | **nouvelle** |
| Partenaires | `partenaires.html` | **nouvelle** |
| FAQ | `faq.html` | **nouvelle** |
| Contact | `contact.html` | **nouvelle** |

Comportement du menu :

- **≥ 900 px** : menu horizontal centré, libellés courts (« Projets »).
- **< 900 px** : bouton « Menu » et tiroir latéral compact, libellés complets, un
  lien par ligne, fermeture par la croix, par le fond ou par la touche Échap,
  défilement de la page bloqué pendant l'ouverture, et bouton « Voter » en bas du tiroir.
- **< 380 px** : le libellé « Menu » disparaît au profit de la seule icône.
- La page courante est détectée automatiquement (`aria-current="page"`).
- Une rangée de liens vers toutes les pages est ajoutée dans le pied de page.

Les nouvelles pages Partenaires et À propos réutilisent les données déjà gérées
dans l'administration (`/api/partners`, `/api/homepage`) ; Billetterie, FAQ et
Contact sont éditoriales.

## 5. À personnaliser avant mise en ligne

- `public/js/contact.js` : `CONTACT_WHATSAPP` et `CONTACT_EMAIL` contiennent des
  valeurs d'exemple à remplacer par les coordonnées officielles.
- `public/billetterie.html` : tarifs, formules et informations pratiques à confirmer.
