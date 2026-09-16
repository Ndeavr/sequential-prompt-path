# Séparation des offres entrepreneurs — Laval

## Ce que l'audit montre déjà en place

- L'offre gratuite 12 mois existe et est décidée côté serveur : table des catégories admissibles, vérification d'admissibilité, réclamation atomique avec plafond par ville, activation authentifiée hors paiement.
- Laval compte aujourd'hui **1 membre gratuit activé** (entretien de gazon). Il reste donc **9 places réelles** — le compteur est calculé, jamais inventé.
- L'Activation Express 350 $ existe déjà (paiement unique, code promo, résolution du prix côté serveur). Aucun nouveau produit ni prix à créer.
- La connexion calendrier, les contrôles RBQ/conformité, CASL/Twilio, l'attribution et les journaux d'audit existent et restent tels quels.

## Décisions retenues

- Les 25 catégories de services résidentiels actuelles restent admissibles au gratuit.
- Les 6 professions (notaire, courtier hypothécaire, courtier immobilier, inspecteur en bâtiment, évaluateur, arpenteur) sortent de l'offre gratuite et ne reçoivent **aucune** offre : message honnête et enregistrement de l'intérêt.
- Laval est la ville poussée; la règle de 10 places par ville reste valable partout.
- Les métiers de construction à forte valeur vont à l'Activation Express 350 $.

## Ce qui change

### 1. Décision d'admissibilité — une seule source

Une fonction serveur unique répond, pour une ville + une catégorie normalisée : `gratuit` (avec places restantes réelles), `express_350`, ou `aucune_offre`. Toutes les surfaces lisent cette réponse; aucune ne devine.

- Services résidentiels + places restantes > 0 → gratuit.
- Services résidentiels + ville complète → Activation Express, avec phrase honnête sur les places comblées.
- Métiers de construction/projet → Activation Express.
- Professions → aucune offre, intérêt noté.
- Catégorie non reconnue → aucune décision automatique, on demande la précision (jamais de classement au hasard).

### 2. Retrait des professions du gratuit

Les 6 professions passent à inactives dans la table des catégories admissibles. Les adhésions existantes ne sont ni supprimées ni modifiées.

### 3. Écran de décision dans le parcours

Après les objectifs, l'entrepreneur voit un seul écran calculé :

- Gratuit : « Votre profil est admissible à l'offre de lancement — 12 mois gratuits. Il reste X places à Laval. » (X vient du serveur; sans donnée fiable, phrase sans chiffre.)
- Payant : « Activation Express — 350 $ » avec la valeur réelle : nettoyage du profil, vérification services et territoire, profil UNPRO prêt à publier, configuration du calendrier, plan d'action 30 jours.
- Aucune offre : message clair, pas de cul-de-sac, pas de faux bouton.

### 4. Fin de la promesse « 3 rendez-vous gratuits »

Retrait de cette formulation des surfaces entrepreneur qui l'affichent encore, remplacée par la formulation de l'offre réelle.

### 5. Calendrier avant admissibilité aux recommandations

La connexion calendrier devient une condition affichée et vérifiée avant l'état « admissible aux recommandations », pour le gratuit comme pour le payant. Le repli Apple reste « Envoi seulement » et ne prétend jamais lire les disponibilités.

### 6. Anti-survente des places

La réclamation reste atomique avec verrou : deux inscriptions simultanées à la 10e place ne peuvent pas passer toutes les deux; la seconde bascule vers l'Activation Express.

## Détails techniques

- Nouvelle RPC `resolve_contractor_offer(p_city, p_category_slug)` (SECURITY DEFINER, lecture seule, accordée à anon/authenticated) qui renvoie `{offer: 'free_founding'|'express_350'|'none', city_remaining, category_group, reason}`. Elle réutilise `founder_eligible_categories` et le comptage réel de `founder_memberships` déjà utilisé par `check_founder_eligibility`.
- Migration de données : `is_active = false` sur les 6 lignes `group_type = 'professional'`; aucune suppression, aucune modification d'adhésion.
- Normalisation de catégorie : réutilisation de `supabase/functions/_shared/localServiceCategories.ts` et de son miroir client; ajout d'une liste explicite des métiers « projet » (général, rénovation, fondation/drain/excavation, toiture, plomberie, électricité, CVAC/thermopompes, pavage, aménagement majeur, décontamination/vermiculite) pour router vers 350 $ au lieu de retourner `null`.
- Client : module `src/lib/offers/resolveContractorOffer.ts` + affichage dans l'écran de décision existant du parcours d'activation; `/fondateurs` et le parcours entrepreneur lisent la même réponse.
- Activation gratuite : aucun changement du chemin atomique existant (`free-service-activate` → RPC de réclamation). Aucun passage par Stripe, jamais de checkout à 0 $.
- Activation Express : `activation-create-checkout` inchangé (montant, code promo, annulation, webhook, idempotence). Aucun produit ni prix Stripe créé.
- Journaux : événements de décision (`offer_decision_shown`, `offer_free_claimed`, `offer_express_checkout_started`) via le journal d'événements existant, avec attribution conservée.
- RLS : la nouvelle RPC n'expose que le nombre de places et le type d'offre, jamais les lignes d'adhésion.
- Tests : décision par catégorie (service / construction / profession / inconnue), plafond Laval à 10, refus de la 11e, concurrence sur la dernière place, persistance du rôle entrepreneur après rafraîchissement, non-régression du checkout 350 $.

## Vérification et limite connue

Vérifications possibles maintenant : parcours gratuit admissible à Laval de bout en bout, parcours métier à forte valeur vers le checkout 350 $, refus au-delà du plafond, concurrence sur la dernière place, persistance de session, RLS, attribution, mobile 390 px, typecheck/tests/build.

**Bloqué, à nommer honnêtement :** le compte Stripe de ce projet est en mode réel uniquement — il n'existe aucune clé de test ni secret de webhook de test. Les vérifications 3 et 4 (checkout → webhook → droit d'accès en mode test, webhook dupliqué, paiement échoué) ne peuvent pas être exécutées tant qu'une clé de test n'est pas fournie. Aucun paiement réel ne sera déclenché et rien ne sera publié côté paiement sans votre accord explicite.
