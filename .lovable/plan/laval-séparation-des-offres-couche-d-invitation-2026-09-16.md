# Laval — séparation des offres + couche d'invitation

Deux volets d'un même parcours : décider l'offre côté serveur, puis inviter les entreprises qualifiées de Laval vers le parcours existant. Aucun nouveau CRM, aucun nouveau tunnel, aucun nouveau système d'envoi.

## Ce que l'audit montre déjà en place

- Offre gratuite 12 mois : catégories admissibles en base, vérification d'admissibilité, réclamation atomique avec plafond de 10 par ville, activation authentifiée hors paiement.
- Laval : **1 membre gratuit activé** (entretien de gazon) → **9 places réelles** restantes. Chiffre calculé, jamais inventé.
- Activation Express 350 $ : checkout existant avec code promo, annulation, webhook et résolution du prix côté serveur. Aucun produit ni prix Stripe à créer.
- Couche d'invitation déjà riche : prospects vérifiés, file d'envoi, garde de conformité commerciale, envoi SMS, suivi de clic, désabonnement, liens courts, quotas et cooldowns, journaux d'erreurs, et un centre de commande d'outreach dans l'admin.
- Attribution affiliée, verrous de recrutement, CASL/Twilio, journaux d'audit : existants et conservés tels quels.

## Décisions retenues

- Les 25 catégories de services résidentiels restent admissibles au gratuit.
- Les 6 professions (notaire, courtiers, inspecteur, évaluateur, arpenteur) sortent du gratuit et ne reçoivent **aucune** offre : message honnête, intérêt noté.
- Laval est la ville poussée; la règle de 10 par ville reste valable partout.
- Métiers de construction / projet → Activation Express 350 $.

## Volet 1 — Décision d'offre, une seule source

Une fonction serveur répond pour ville + catégorie normalisée : `gratuit` (avec places restantes réelles), `express_350`, ou `aucune_offre`. Toutes les surfaces (landing, parcours, file d'invitation, message) lisent cette réponse; aucune ne devine.

- Service résidentiel + places > 0 → gratuit.
- Service résidentiel + ville complète → Express, avec phrase honnête sur les places comblées.
- Métier de projet → Express.
- Profession → aucune offre.
- Catégorie non reconnue → aucune décision automatique, on demande la précision.

Les 6 professions passent à inactives dans la table des catégories admissibles. Aucune adhésion existante n'est modifiée.

### Écran de décision dans le parcours

Après les objectifs, un seul écran calculé :

- Gratuit : « Votre profil est admissible à l'offre de lancement — 12 mois gratuits. Il reste X places à Laval. »
- Payant : « Activation Express — 350 $ » avec la valeur réelle : nettoyage du profil, vérification services et territoire, profil prêt à publier, configuration du calendrier, plan d'action 30 jours.
- Aucune offre : message clair, pas de cul-de-sac, pas de faux bouton.

La formulation « 3 rendez-vous gratuits » est retirée des surfaces entrepreneur qui l'affichent encore.

La connexion calendrier devient une condition affichée et vérifiée avant l'état « admissible aux recommandations », pour le gratuit comme pour le payant. Le repli Apple reste « Envoi seulement ».

## Volet 2 — Couche d'invitation Laval

### File d'invitation interne (réparation, pas création)

Une vue Laval dans le centre de commande d'outreach existant, affichant uniquement des données réelles : entreprise, service, ville, contacts, offre attribuée (Gratuit / 350 $ / non admissible), admissibilité et places restantes, consentement et suppression, source d'attribution et affilié, statut de cycle de vie (validé, invité, livré, cliqué, inscrit, OTP vérifié, onboarding démarré, activé, vérifié, admissible), dernier évènement et horodatage.

Actions sûres seulement : approuver un message, envoyer un message approuvé, copier le lien personnalisé, appeler le prochain prospect, mettre en pause / supprimer. Aucune donnée de livraison, clic, activation, avis, score ou vérification simulée.

### Lien d'invitation

Un lien unique et expirant par prospect, généré via le mécanisme de lien court existant, qui conserve prospect, affilié et UTM à travers l'inscription, l'OTP, le rafraîchissement, le checkout et l'activation, et qui entre directement dans le parcours d'onboarding existant.

### Envois

Toujours à travers la garde de conformité existante : consentement, suppression, cooldown, plafond quotidien, heures d'envoi, verrou de recrutement, exclusion RBQ/conformité. Un envoi n'est marqué réussi que lorsque le fournisseur confirme l'acceptation; sinon échec enregistré avec motif, réessai possible.

L'offre gratuite cesse automatiquement d'être envoyée dès que la capacité de Laval est atteinte — la décision est relue au moment de l'envoi, pas seulement à la création. Une invitation déjà envoyée n'est jamais changée en douce.

Relance uniquement pour les prospects non activés, jamais pour un contact désabonné ou supprimé.

### Messages (FR québécois, ajoutés seulement s'ils manquent)

Gratuit : « Bonjour {{first_name}}, UNPRO ouvre présentement Laval à un petit groupe d'entreprises de services. Votre profil peut être admissible à 12 mois gratuits, selon votre service et les places restantes. Vérifiez votre admissibilité ici : {{invite_link}} Répondez STOP pour vous désabonner. »

Payant : « Bonjour {{first_name}}, UNPRO aide les entrepreneurs de Laval à être recommandés à des propriétaires selon leur territoire et leur disponibilité — sans demandes partagées à cinq entreprises. Vérifiez votre profil IA et activez votre entreprise ici : {{invite_link}} Répondez STOP pour vous désabonner. »

### Permissions

Seuls les administrateurs voient les prospects, approuvent, envoient ou exportent. Un affilié ne voit que les prospects et l'attribution qui lui sont assignés. Aucune coordonnée privée exposée publiquement.

### États

File vide, échec avec motif exact et reprise, capacité atteinte, et parcours d'appel « Prochain prospect » utilisable sur téléphone.

## Détails techniques

- Nouvelle RPC `resolve_contractor_offer(p_city, p_category_slug)` (SECURITY DEFINER, lecture seule) : `{offer, city_remaining, category_group, reason}`, réutilisant `founder_eligible_categories` et le comptage réel de `founder_memberships`.
- Migration de données : `is_active = false` sur les 6 lignes `group_type = 'professional'`.
- Normalisation : réutilisation de `_shared/localServiceCategories.ts` et de son miroir client; ajout d'une liste explicite des métiers « projet » (général, rénovation, fondation/drain/excavation, toiture, plomberie, électricité, CVAC/thermopompes, pavage, aménagement majeur, décontamination/vermiculite) pour router vers 350 $ au lieu de retourner `null`.
- Client : `src/lib/offers/resolveContractorOffer.ts`, lu par l'écran de décision du parcours, par `/fondateurs` et par la file d'invitation.
- Réutilisation sans duplication : `verified_contractor_prospects`, `commercial-send-gate`, `sms-prospect-send`, `track-outreach-click`, `outreach-shortlink-resolve`, `outreach-unsubscribe`, `outreach-retry-failed`, quotas et cooldowns existants, liens affiliés existants, `/admin/outreach-command-center`.
- Activation gratuite : chemin atomique existant inchangé (`free-service-activate` → RPC de réclamation). Jamais de checkout à 0 $.
- Activation Express : `activation-create-checkout` et le webhook inchangés (montant, promo, idempotence).
- Journaux : évènements de décision et d'invitation dans le journal existant, attribution conservée.
- RLS : la RPC n'expose que le type d'offre et le nombre de places; la file d'invitation reste admin, la vue affilié filtrée par assignation.
- Tests : décision par catégorie, plafond Laval à 10, refus de la 11e, concurrence sur la dernière place, STOP/suppression, plafond quotidien, prospect en double, envoi en double, envoi échoué, persistance du rôle et de l'attribution après rafraîchissement, aucun contournement d'OTP / calendrier / conformité / paiement, non-régression du checkout 350 $.

## Limite connue à nommer d'avance

Le compte Stripe de ce projet est en **mode réel uniquement** : il n'existe aucune clé de test ni secret de webhook de test. Les vérifications « checkout test → webhook → droit d'accès », webhook dupliqué et paiement échoué ne peuvent pas être exécutées tant qu'une clé de test n'est pas fournie. Tout le reste est vérifiable maintenant. Aucun paiement réel ne sera déclenché et rien ne sera publié côté paiement sans votre accord explicite.
