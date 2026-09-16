# Flows entrepreneur : un seul chemin vers le plan personnalisé

Objectif : aucun entrepreneur ne doit jamais atterrir sur les plans Maison ni sur une grille de prix générique. Chaque bouton, relance ou redirection entrepreneur mène au même tunnel personnalisé, préchargé avec ses vraies données.

## Ce qui ne va pas aujourd'hui (constaté dans le code)

- Le bloc d'upsell du tableau de bord entrepreneur (`DashUpsell`) affiche des prix écrits en dur (49 $, 99 $, 199 $, 399 $) qui ne correspondent plus au catalogue réel, et son bouton pointe vers `/pricing`, qui redirige vers les plans Maison.
- Même problème pour plusieurs autres surfaces entrepreneur : objectif du tableau de bord, panneau de vente Clara, page de disponibilités, bandeaux de rétrogradation/verrouillage, et une relance automatique de Clara qui envoie vers `/pricing`.
- Quatre destinations concurrentes coexistent pour la même intention : `/entrepreneur/pricing` (grille générique), `/entrepreneur/plan`, `/entrepreneur/checkout` et `/entrepreneur/devis-personnalise` (le vrai tunnel personnalisé).
- La page du plan personnalisé n'existe qu'avec un identifiant de devis dans l'adresse, donc aucun bouton ne peut simplement « ouvrir mon plan ».

## Ce qui change

### 1. Une seule porte d'entrée
Ajout d'une route d'entrée `/entrepreneur/plan-personnalise` (sans identifiant), à côté de la page existante `/entrepreneur/plan-personnalise/:quoteId` — pas de nouvelle page de prix, pas de doublon. Cette entrée :
- affiche un état de chargement tant que le compte et le profil ne sont pas résolus (aucun prix affiché avant) ;
- si le compte est entrepreneur et qu'un devis valide existe : ouvre directement son plan réel ;
- si le profil est incomplet : envoie à l'étape précise manquante, puis revient automatiquement ici ;
- si le compte est propriétaire : renvoie vers les plans Maison ;
- si la personne n'est pas connectée : garde l'objectif et le contexte à travers la connexion.

### 2. Contexte d'objectif
Tous les boutons transmettent leur intention : `?objective=more_appointments`, `visibility`, `territory`, `upgrade`. L'objectif préremplit la recommandation, sans la verrouiller : l'entrepreneur peut encore ajuster services, territoire, capacité et budget avant de payer.

### 3. Libellés cohérents
Remplacement des libellés vagues et des prix écrits en dur par : « Voir mon plan personnalisé », « Obtenir plus de rendez-vous », « Développer mon territoire », « Améliorer ma visibilité IA ». Les montants affichés viennent du catalogue réel ou du devis, jamais du code.

### 4. Surfaces à corriger
Tableau de bord entrepreneur et dock mobile, cartes de croissance et score IA/AIPP, limites de projets/territoire/rendez-vous, compte et abonnement, écrans de succès et d'annulation de paiement, relances Clara, notifications et liens profonds, redirections après connexion.

### 5. Cloisonnement des rôles
- Un entrepreneur connecté ne peut plus ouvrir un paiement de plan Maison depuis un bouton ou un lien profond.
- Un propriétaire connecté ne peut pas entrer dans le tunnel entrepreneur.
- Rôle en cours de résolution : aucun bouton tarifaire affiché.

### 6. Suivi
Chaque clic enregistre : bouton, page d'origine, objectif, plan recommandé affiché, puis ouverture du paiement — via le système d'étapes de tunnel déjà en place, sans nouvelle table.

## Détails techniques

- Nouveau module de routage entrepreneur (`src/lib/routing/contractorPlanRoute.ts`) : construction unique de l'URL avec objectif + origine, et résolution de la destination selon le rôle.
- Nouvelle page d'entrée `PageContractorPlanEntry` montée sur `/entrepreneur/plan-personnalise`, réutilisant `contractorPlanEligibility`, `usePlanCatalog`, `useContractorSubscription` et le service de devis existant (`compute-pricing-quote` / `fetchPricingQuote`). Aucun nouveau backend.
- Redirections : `/entrepreneur/pricing`, `/entrepreneur/plan`, `/entrepreneur/pricing-calculator` et `/plans-prix` (côté entrepreneur) pointent vers la nouvelle entrée en conservant les paramètres. `/pricing/entrepreneurs` reste une page publique marketing, mais son bouton mène au tunnel ; un entrepreneur connecté y est redirigé.
- `/pricing` et `/pricing/proprietaires` deviennent inaccessibles en CTA pour un compte entrepreneur (redirection vers son plan).
- `DashUpsell`, `DashObjective`, `AlexSalesPanel`, `ContractorAvailabilityPage`, `SignatureLockedOverlay`, `SignatureDowngradeBanner`, `AlexAutopilotProvider`, `CheckoutPanel`, `PageContractorCheckout` et les écrans de score/AIPP passent par le module de routage commun.
- `PageContractorPricingIntake` et `PageContractorPersonalizedPlan` lisent l'objectif et affichent les données réelles déjà connues (service principal, services acceptés, villes, capacité, type/budget de projets, score, éléments à améliorer, forfait recommandé, prix, inclusions, échéance, code promo validé côté serveur).
- Tests : résolution de rôle (entrepreneur, propriétaire, inconnu), profil incomplet avec retour automatique, conservation de l'objectif à travers la connexion, absence de tout lien entrepreneur vers `/pricing`, prix jamais écrits en dur. Plus `tsgo`, lint critique et compilation, et vérification mobile 390 px / bureau.

## Hors périmètre

Aucun changement de prix, de produit ou de clé Stripe, aucun envoi SMS/courriel, aucune modification des données de production, aucune nouvelle table.
