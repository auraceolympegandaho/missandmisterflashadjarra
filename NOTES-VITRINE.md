# Vitrine des candidats (accueil) — notes de déploiement

- Aucune action manuelle sur la base : au redémarrage, `initSchema()` ajoute les colonnes
  `academic_path`, `interests`, `talent`, `motivation` et `is_published`.
- `is_published` vaut 0 par défaut : **aucun candidat existant n'apparaît tant que l'administration ne le publie pas**
  (Admin > Candidats > bouton « Publier », ou case « Publier ce profil » dans le formulaire).
- Un profil est public s'il est **publié ET actif** (le bouton « Masquer » retire aussi le profil de la vitrine).
- API publique : `GET /api/showcase` et `GET /api/showcase/:id` (aucune donnée de vote ni de classement).
- Page profil : `/profil.html?id=…` (sans bouton de vote). La page de vote `/candidat.html` est inchangée.
- Couronne : `public/img/crown.webp` (votre photo, fond détouré). Hero de l’accueil : `.hero-crown` dans `public/css/showcase.css`. Autres pages : fond fixe très discret dans `public/css/crown-bg.css`.
- La mention « admin » a été retirée des pages publiques ; l'interface reste accessible via `/admin.html` (connexion habituelle).
