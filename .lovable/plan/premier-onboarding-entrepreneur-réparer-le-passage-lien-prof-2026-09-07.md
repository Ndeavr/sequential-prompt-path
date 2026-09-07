# Premier onboarding entrepreneur : réparer le passage lien → profil activé

## Ce que montrent les données réelles (vérifié ce matin)

Journal `contractor_funnel_events`, 3 derniers jours :

- 12 ouvertures de page d'activation (`/unpro/activate/:token`), dont 5 aujourd'hui entre 05 h 30 et 07 h 01 (Toronto : 01 h 30 – 03 h 01), chacune avec un identifiant de prospect réel et distinct.
- 2 clics sur le bouton principal aujourd'hui (09 h 07 et 09 h 11 UTC).
- 0 démarrage d'authentification, 0 code envoyé, 0 compte créé aujourd'hui.

Le goulot est donc mesuré et unique : **entre le clic sur le bouton et la première étape de connexion**. Le clic mène à `/join/profile`, qui, sans session, redirige immédiatement vers l'écran de connexion générique proposant trois méthodes (Google, SMS, lien courriel) sans coordonnée préremplie. Personne n'a franchi cet écran.

Constats secondaires vérifiés :

- La page d'activation actuelle est longue : score, avis, grille de faits, liste d'avantages, bouton flottant qui n'apparaît qu'après défilement. Le bouton n'est pas visible d'emblée sur un écran de téléphone.
- L'identifiant de prospect n'est écrit que dans les métadonnées de l'événement, jamais dans la colonne dédiée `prospect_id` ni dans la colonne `token` — l'attribution par étape est donc impossible telle quelle.
- La taxonomie demandée (`activation_link_opened`, `otp_requested`, `profile_claimed`, `profile_activated`, `activation_error`…) n'existe pas encore ; seuls `activation_page_viewed` et `activation_cta_clicked` sont écrits.
- Les six ouvertures d'anciens liens ne pourront pas être attribuées rétroactivement au-delà de « page vue » : la donnée n'a jamais été écrite. C'est un blocage historique, pas un blocage externe ; les prochaines visites seront correctement instrumentées.

## Objectif de ce lot

Un vrai lien d'activation, ouvert sur téléphone en session déconnectée, mène jusqu'à `profile_activated` sans quitter le contexte de l'entreprise, sans écran générique, sans perte de données.

Aucun SMS, courriel, paiement, vague de prospection ni Google Places dans ce lot.

## Ce qui sera construit

### 1. Écran d'activation mobile-first

Refonte du haut de `/unpro/activate/:token` — la page existante est conservée, seul l'ordre et la densité changent :

- Titre immédiat : « Activez le profil de {nom réel de l'entreprise} ».
- Résumé compact et véridique : métier, région, statut de la source, offre rattachée à l'invitation.
- Un seul bouton visible sans défilement : « Activer mon profil gratuitement ».
- La promesse des trois rendez-vous gratuits ne s'affiche que si le serveur confirme l'admissibilité enregistrée avec l'invitation ou le prospect. Sinon, elle est absente.
- Le score, les avis et la grille de faits restent, mais sous le bouton, comme preuve secondaire.
- Retrait à cette étape de toute demande de logo, avis, objectifs détaillés, calendrier ou forfait payant.

### 2. Activation en une seule page, sans détour par l'écran générique

Le bouton n'envoie plus vers `/login`. Il ouvre, sur la même page, une étape de vérification minimale :

- Coordonnée déjà connue (téléphone ou courriel) préremplie et modifiable.
- Code de vérification expliqué en clair, bouton « Valider » explicite, renvoi du code avec temporisation.
- Messages d'erreur précis (code expiré, code erroné, coordonnée invalide, réseau).
- Le contexte d'activation (jeton, prospect, entreprise, métier, région, source, offre) survit au rafraîchissement, à la fermeture et au retour.
- Compte déjà existant : reconnexion silencieuse et rattachement, pas de doublon.

Après validation du code, l'activation du profil est enregistrée immédiatement. L'enrichissement du profil devient l'étape suivante et ne bloque jamais l'activation.

### 3. Rattachement sûr côté serveur

Une fonction serveur unique et idempotente prend le jeton et l'utilisateur authentifié, puis : vérifie la validité et la durée du jeton, attribue le rôle entrepreneur, crée ou retrouve le profil entrepreneur du bon prospect, marque l'invitation comme utilisée, écrit l'activation. Le jeton n'apparaît jamais dans les journaux.

Un prospect ne peut réclamer que son propre profil ; les politiques d'accès existantes protègent les autres. Une deuxième ouverture d'un lien déjà utilisé affiche « profil déjà activé » avec accès direct au tableau de bord.

### 4. Mesure complète du tunnel

Écriture des étapes demandées avec horodatage America/Toronto, identifiant de prospect en colonne dédiée, jeton haché et identifiant de session non sensible : ouverture du lien, rendu de page, clic, démarrage d'authentification, code demandé, code validé, compte créé, profil réclamé, onboarding démarré, onboarding complété, profil activé, erreur d'activation (avec étape et code exploitable, sans donnée personnelle).

Ajout dans l'administration d'une vue d'activation alimentée uniquement par la production : visiteurs uniques, progression par étape, abandons, erreurs, et les trois taux demandés (ouverture → clic, clic → code validé, code validé → profil activé).

### 5. États d'interface obligatoires

Chargement, lien invalide, lien expiré, invitation déjà utilisée, entreprise introuvable, coordonnée manquante, échec du code, erreur réseau, compte existant, succès, reprise après interruption — chacun avec une prochaine action claire, en français, en anglais si la langue active est l'anglais.

## Détails techniques

- Front : `src/pages/activation/PageUnproActivate.tsx` réordonné ; nouvelle étape de vérification en composant local sous `src/features/activationProfile/`, réutilisant `PhoneOtpForm` / `LoginMagicLinkForm` existants plutôt qu'un nouveau mécanisme d'authentification.
- Le contexte est déjà porté par `saveRoleIntent` / `saveAuthIntent` ; on le conserve et on y ajoute la persistance du jeton, du prospect et de l'offre.
- Serveur : extension de `activation-token-resolve` pour renvoyer la coordonnée masquée, le statut de source et l'admissibilité à l'offre ; nouvelle fonction `activation-claim` pour le rattachement idempotent. Import Supabase via `esm.sh@2.49.1`, conformément au standard du projet.
- Journalisation via `logFunnelEvent` (client) et `logServerFunnelEvent` (serveur), en remplissant enfin les colonnes `prospect_id`, `token`, `channel`, `failure_reason` et `dedupe_key`.
- Migration seulement si nécessaire : la table d'événements possède déjà les colonnes requises ; un index sur (`event_type`, `created_at`) et une vue d'agrégation seront ajoutés si la vue d'administration en a besoin, avec GRANT explicites.
- Tests : parcours mobile 390 px déconnecté en Playwright sur un vrai jeton en mode aperçu, deuxième ouverture, jeton expiré, échec de code, plus les tests unitaires existants (325) qui doivent rester au vert.

## Validation avant publication

Tests complets, build, correction de toute régression, parcours réel mené jusqu'à `profile_activated` sur téléphone, scan de sécurité, puis publication et test de fumée après publication. Rapport final : commit, résultats étape par étape, cause exacte de tout abandon observé, blocages réellement externes uniquement.
