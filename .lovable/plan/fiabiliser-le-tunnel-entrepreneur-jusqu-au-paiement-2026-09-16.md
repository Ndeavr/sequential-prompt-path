# Fiabiliser le tunnel entrepreneur jusqu'au paiement

Objectif : rendre les chiffres vrais, puis prouver un parcours réel mobile depuis le lien d'invitation jusqu'à Stripe. Le prix de 350 $ n'est pas touché.

## Ce que les données montrent aujourd'hui (vérifié maintenant)

- 7 jours : 103 ouvertures d'audit IA, 25 profils commencés, **2 profils complétés**, 11 devis calculés, **0 paiement démarré**.
- La page du plan personnalisé appelle bien Stripe, mais **n'enregistre aucun événement** avant ni après l'appel. « 0 checkout » est donc partiellement un trou de mesure, pas seulement un blocage.
- 100 % des événements des 7 derniers jours sont marqués « vrai trafic ». Le seul marquage interne existant demande d'ajouter `?qa=1` à la main.
- 4 sessions de paiement en base restent « pending » depuis août/septembre, jamais réconciliées.
- Le compteur de places compte correctement par ville **et** par service : Laval a 1 membre activé en entretien de gazon (9 places restantes dans ce service), les autres services affichent 10. L'affichage global « 10 places à Laval » ne reflète pas cette réalité.

## Ce qui va être fait

### 1. Étapes du tunnel nommées une seule fois
Une liste unique et ordonnée d'étapes, utilisée partout :
audit ouvert → entreprise reconnue → profil commencé → profil complété → devis calculé → plan présenté → paiement créé → paiement réussi → compte activé.
Chaque étape n'est écrite qu'une fois par session (clé anti-doublon), avec la ville, le service, l'offre calculée et la provenance.

### 2. Boucher le trou avant Stripe
Sur la page du plan personnalisé : enregistrer « plan présenté », « paiement créé » (avec l'identifiant de session Stripe), « paiement refusé » avec le motif exact, et « retour annulé ». Toute erreur devient un message lisible à l'écran, jamais un bouton qui tourne dans le vide. Même traitement sur l'écran d'activation à 350 $.

### 3. Séparer le trafic interne
Un événement est marqué interne si l'une de ces conditions est vraie : compte administrateur connecté, session ouverte avec `?qa=1`, ou entreprise/téléphone figurant dans une courte liste interne gérée en base. Les tableaux de bord et le rapport lisent une vue qui exclut ces lignes par défaut, avec une bascule « inclure les tests ». Aucun événement n'est supprimé.

### 4. Réconcilier les paiements
Une session de paiement n'est comptée comme intention d'achat que si elle a un montant supérieur à zéro et un identifiant Stripe réel. Les sessions à 0 $ ou sans identifiant passent en « non retenue ». Les 4 sessions anciennes bloquées en « pending » sont rapprochées de Stripe en lecture seule, puis classées : payée, expirée, ou à vérifier. Aucun paiement n'est créé ni rejoué.

### 5. Compteur de places juste
L'affichage des places restantes lit toujours le compteur serveur par ville + service, et une activation le fait baisser immédiatement. Si aucun service n'est précisé, la page affiche le détail par service plutôt qu'un total inventé.

### 6. Test réel, mobile, de bout en bout
Parcours complet sur téléphone depuis un lien d'invitation : lien → page → inscription → code SMS → profil → devis → écran de paiement Stripe. Le test s'arrête avant de payer en mode réel. Preuves attendues : les 9 étapes présentes dans l'ordre pour une même session, l'identifiant de session Stripe enregistré, aucune erreur silencieuse.

## Détails techniques

- Nouveau module partagé `src/lib/analytics/funnelSteps.ts` : étapes canoniques + clés d'idempotence, utilisé par `logFunnelEvent`.
- Instrumentation ajoutée dans `src/pages/contractor-funnel/PageContractorPersonalizedPlan.tsx`, `PageContractorPricingIntake.tsx`, `src/pages/entrepreneur/PageEntrepreneurPlans.tsx` et l'écran d'activation 350 $.
- Migration : colonne `internal_reason` sur `contractor_funnel_events`, table `funnel_internal_actors` (RLS admin), vue `v_contractor_funnel_real` (SECURITY INVOKER) excluant `is_test` et `internal_reason`, plus les GRANT correspondants.
- `checkout_sessions` : colonne `reconciliation_status` (`counted`, `not_counted_zero`, `needs_review`) et fonction de rapprochement en lecture seule contre Stripe, exécution à blanc par défaut.
- Vue publique de capacité corrigée pour dériver les places de `local_service_offer_status` (ville + service) au lieu d'un total figé.
- Aucune modification des prix, produits Stripe, clés live, envois SMS/courriel, ni des routes existantes.

## Terminé quand

- Une session réelle mobile produit les 9 étapes ordonnées, sans doublon.
- Le rapport affiche séparément trafic réel et trafic interne.
- Aucune session à 0 $ n'est comptée comme intention d'achat.
- Laval affiche des places exactes par service, décrémentées à l'activation.
- Le plus grand décrochage mesuré est identifié avec des chiffres propres.
