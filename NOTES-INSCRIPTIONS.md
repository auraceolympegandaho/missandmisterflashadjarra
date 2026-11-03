# Module d'inscription en ligne — notes d'intégration

## 0. À lire en premier : écart avec le cahier des charges

Le cahier des charges parle de **Node.js + SQLite**. L'analyse du code montre que l'application utilise en réalité
**Node.js + PostgreSQL** (`pg`, `DATABASE_URL`, hébergement Render) et **Cloudinary** pour les photos publiques.
Le module a donc été écrit pour **PostgreSQL**, en suivant les conventions existantes (`initSchema` au démarrage,
`CREATE TABLE IF NOT EXISTS`, table `settings` clé/valeur). Si ton site tourne bien sur SQLite ailleurs, préviens-moi :
les requêtes sont à adapter.

## 1. Ce qui a été ajouté / modifié

**Fichiers nouveaux**

| Fichier | Rôle |
|---|---|
| `server/registration/schema.js` | Migration : 5 nouvelles tables (voir §3) |
| `server/registration/config.js` | Paramètres d'inscription, calcul de la phase (ouverte / pas encore / terminée) |
| `server/registration/validate.js` | Validation serveur de tous les champs |
| `server/registration/security.js` | Jeton de formulaire signé, limiteur de débit, détection réelle du type d'image |
| `server/registration/notify.js` | File de notifications extensible (aucun envoi par défaut) |
| `server/routes/registration.js` | API publique : `config`, `form-token`, `submit`, `track` |
| `server/routes/admin-registrations.js` | API admin : stats, paramètres, liste, détail, statut, CSV, fichiers |
| `public/inscriptions.html` | Page « DEVIENS MISS OU MISTER FLASH ADJARRA 2027 » |
| `public/inscription-formulaire.html` | Formulaire en 6 étapes |
| `public/inscription-conditions.html` | Conditions de participation (lues depuis la configuration) |
| `public/inscription-suivi.html` | Suivi de candidature |
| `public/js/inscriptions.js`, `public/js/inscription-form.js` | Logique des pages publiques |
| `public/js/admin-registrations.js`, `public/css/admin-registrations.css` | Onglet admin |
| `public/css/registration.css` | Style BLACK & GOLD du module (préfixe `.reg-`) |

**Fichiers existants modifiés (changements additifs)**

- `server/db.js` : une ligne appelle la migration du module à la fin de `initSchema()`.
- `server/server.js` : montage de `/api/registration`, `trust proxy`, en-têtes de sécurité de base, limiteur sur
  `/api/admin/login`, gestionnaire d'erreurs final sans détail interne.
- `server/routes/admin.js` : montage de `/api/admin/registrations` **après** `requireAdmin`.
- `public/js/nav.js` : entrée « Inscriptions » (après Candidats). Les autres rubriques du menu sont conservées.
- `public/admin.html` : onglet « Gestion des candidatures » + chargement des deux nouveaux fichiers.

Aucune dépendance npm n'a été ajoutée (`crypto`, `bcryptjs` et `multer` étaient déjà là).

## 2. Mise en service

1. Déployer. Au premier démarrage, les nouvelles tables sont créées ; **rien d'existant n'est modifié ni supprimé**.
2. Admin → **Gestion des candidatures** → **Paramètres des inscriptions**. Renseigner au minimum le règlement, la
   politique de confidentialité, les dates et les limites d'âge, puis cocher *Inscriptions ouvertes*.
3. Les inscriptions sont **fermées par défaut**. Le site n'annonce jamais leur ouverture avant ton activation.

## 3. Base de données (nouvelles tables)

`registration_applications` (dossier, statut, hash du code de suivi) · `registration_documents` (pièces) ·
`registration_status_history` (statuts, commentaires internes, « dossier complet ») · `registration_consents`
(5 consentements, avec la version du règlement acceptée) · `registration_notifications` (journal des notifications).
Les paramètres sont stockés dans la table `settings` existante (clé `registration_settings`).

**Pièces et photos privées** : le disque de Render est éphémère et Cloudinary est configuré pour des images publiques.
Les pièces sont donc stockées **dans PostgreSQL (colonne BYTEA)**, sous un nom interne aléatoire, et ne sont servies
que par une route admin protégée par jeton. Elles ne sont jamais dans `public/` ni sur une URL publique.
Avec 3 Mo maximum par fichier, prévoir ~3 à 9 Mo par dossier selon les pièces demandées (surveiller le quota de la base).

## 4. Sécurité — ce qui est en place

- **Période d'inscription vérifiée côté serveur** à chaque dépôt (heure du serveur).
- Validation serveur complète ; requêtes SQL paramétrées ; les filtres de recherche échappent `%` et `_`.
- **Fichiers** : taille limitée par `multer`, type vérifié par les premiers octets (JPG/PNG réels), nom d'origine
  jamais utilisé, nom interne aléatoire, jamais écrits sur le disque.
- **XSS** : toutes les données affichées (public et admin) passent par `textContent`.
- **CSRF** : les API n'utilisent aucun cookie (jeton `Bearer` pour l'admin), donc pas de CSRF classique. Le dépôt exige
  en plus un **jeton de formulaire signé** (âge entre 8 s et 3 h), plus un champ piège anti-robots.
- **Limitation de débit** : dépôt (30/h/IP par défaut), suivi (12/15 min/IP), connexion admin (15/15 min/IP).
  Verrouillage d'un dossier 15 min après 5 codes de suivi erronés (stocké en base).
- Messages d'erreur génériques ; même message pour « référence inconnue » et « mauvais code ».
- Code de suivi stocké **haché (bcrypt)** ; seule l'IP **hachée** est conservée.
- Export CSV : sans pièces ni documents ; **coordonnées exclues** sauf choix explicite (« CSV + coordonnées ») ;
  protection contre l'injection de formules Excel ; séparateur `;` (Excel francophone).

## 4 bis. Suivi de candidature : choix à valider

Le cahier des charges propose un code à usage unique envoyé par e-mail ou SMS. **Aucun service d'envoi n'est configuré**
(et le formulaire n'imposait pas d'e-mail). À la place, chaque candidat reçoit à la confirmation un **code de suivi
personnel** (format `XXXX-XXXX`), affiché une seule fois. La référence seule ne donne jamais accès au dossier.
Conséquence : **un code perdu ne peut pas être renvoyé automatiquement** (il faudrait une procédure manuelle, ou un
service e-mail/SMS à brancher). Un champ e-mail **facultatif** a été ajouté au formulaire pour préparer ce cas.

## 5. Notifications

La confirmation s'affiche à l'écran. Chaque dépôt écrit une ligne dans `registration_notifications` (accusé au candidat,
alerte admin) avec le statut `skipped` tant que `MAIL_PROVIDER` n'est pas configuré. Le site **n'affirme jamais** qu'un
courriel est parti dans ce cas. L'écriture se fait après validation de la candidature : une panne de notification ne
peut pas la faire perdre. Pour brancher un service : ajouter un transport dans `PROVIDERS` (`registration/notify.js`)
et un traitement des lignes `pending`.

## 6. Compatibilité avec le vote

Les candidatures vivent dans `registration_applications`, **séparées** de `candidates`. Le module n'écrit jamais dans
`candidates`, `votes_count`, `transactions` : une candidature n'apparaît donc **jamais** dans la liste publique.
Pour faire entrer un candidat retenu au vote, créer sa fiche **manuellement** dans l'onglet *Candidats* existant.
(Une action « créer la fiche depuis la candidature » est possible plus tard si tu le souhaites.)

## 7. Conditions non définies — à décider par l'organisation

Rien n'a été inventé. Tant que ces éléments sont vides, le site affiche « Non encore défini » :
**âge minimum et maximum** (aucune vérification d'âge appliquée) · **filières et niveaux autorisés** (saisie libre) ·
**dates d'ouverture et de clôture** · **règlement** · **politique de confidentialité** · **conditions particulières** ·
**pièces exigées** (seule la photo est obligatoire par défaut). L'admin voit des avertissements tant que le règlement
ou la politique de confidentialité manquent. Ne pas ouvrir les inscriptions avant de les avoir renseignés.

## 8. Remarques sur le cahier des charges

- Il passe de l'étape 4 à l'**étape 6** : le formulaire compte **6 étapes** (Identité, Université, Présentation, Photos,
  Engagement, Récapitulatif).
- « Une photo de la candidate » : la photo est exigée pour **MISS comme pour MISTER**. Carte d'étudiant et pièce
  d'identité sont disponibles en option (désactivées par défaut).
- Un même numéro de téléphone ne peut déposer qu'**un dossier actif** (anti-doublon).
- Pas de rôles différenciés : il n'existe qu'un type de compte admin, tous les administrateurs ont les mêmes droits
  (l'auteur de chaque modification est enregistré dans l'historique).
- Le candidat ne peut pas modifier ni compléter son dossier lui-même : en cas de « Dossier incomplet », l'organisation
  indique les corrections attendues et le candidat les voit dans le suivi.

## 9. Points de vigilance existants (hors module)

- Le compte admin par défaut est `admin` / `changeme123` si `ADMIN_PASSWORD` n'est pas défini : **à changer en production**.
- `JWT_SECRET` doit être défini en production (il signe aussi les jetons de formulaire).
- CORS est ouvert à toutes les origines (comportement existant, inchangé).
- Aucune politique CSP complète n'a été ajoutée, pour ne pas casser les pages existantes (YouTube, etc.).
