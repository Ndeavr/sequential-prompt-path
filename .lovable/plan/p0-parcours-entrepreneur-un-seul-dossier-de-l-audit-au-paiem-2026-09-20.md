# P0 — Parcours entrepreneur : un seul dossier, de l'audit au paiement (et relance si abandon)

Objectif : tout entrepreneur arrive sur `/entrepreneurs/audit-ia`, et ce qu'on y trouve le suit
jusqu'au plan et au paiement, sans jamais être redemandé ni écrasé. Si le paiement n'est pas
complété, un lead de relance est créé et une notification est envoyée.

## 1. Une seule porte d'entrée

- Rediriger vers `/entrepreneurs/audit-ia` toutes les entrées entrepreneur encore parallèles
  (`/entrepreneur/onboarding`, écrans `/n/*`, anciens écrans d'activation, CTA « Je suis
  entrepreneur » de Clara texte et voix, landings de prospection, liens affiliés).
- Aucune page n'est supprimée : elle redirige.
- Les paramètres d'attribution (prospect, ref, affilié, UTM, jeton d'audit) sont recopiés
  à chaque saut, comme aujourd'hui dans le parcours affilié.

## 2. Un seul dossier entrepreneur

- Le dossier ouvert à l'audit devient la source unique : identité, coordonnées, site, ville,
  catégories, licences, données publiques, avis, territoire, rayon, objectifs, valeur moyenne
  des projets, scores, source/attribution.
- Chaque donnée porte son niveau de confiance. Règle appliquée partout :
  **confirmé par l'entrepreneur > vérifié par une source > déduit**.
  Une donnée déduite ne remplace jamais une donnée de rang supérieur — c'est la cause du cas
  « Laval vérifiée puis remplacée par Terrebonne déduite ». Une ville déduite différente est
  proposée, jamais imposée.
- Les écrans suivants préremplissent et n'interrogent que ce qui manque réellement.
  Reprise fiable après rafraîchissement, retour arrière ou retour mobile.

## 3. Métier principal et métier secondaire

- Deux sélecteurs dans le profil, recherche dans le catalogue complet des métiers et services
  UNPRO (pas une liste locale, pas une liste dérivée du métier détecté).
- Recherche au clavier, sélection par Entrée ou clic, libellé officiel affiché, « Aucun » permis
  pour le secondaire, doublon principal = secondaire bloqué, sauvegarde immédiate.
- Prérempli depuis l'audit seulement si la confiance est suffisante ; les suggestions connexes
  restent visibles ailleurs mais ne limitent pas le choix.

## 4. Champs numériques

- Correction de `075`, `04`, `03000` : champ vide avec texte d'aide au lieu d'un zéro,
  remplacement à la première frappe, normalisation, clavier numérique conservé sur mobile.
- Appliqué à rayon, rendez-vous par mois, valeur moyenne des projets et aux autres champs
  chiffrés du parcours.

## 5. Scores et données d'audit

- Les scores calculés par l'audit (présence Google, visibilité IA) ne sont plus redemandés :
  ils sont affichés avec leur provenance. Si rien de fiable n'existe, « Non déterminé » —
  jamais une valeur inventée.
- Même règle pour RBQ, site web, téléphone, ville et avis.

## 6. Plan personnalisé cohérent

- Le plan utilise les données confirmées du dossier : même ville, même métier.
- Rendez-vous visés, potentiel mensuel et retour sur investissement sont calculés côté serveur à
  partir du dossier ; toute hypothèse est étiquetée comme telle.

## 7. Abandon avant paiement = lead à relancer

- Source de vérité : le signal de paiement. Session de paiement créée mais non payée ou expirée
  → abandon. Plan présenté sans session de paiement → abandon constaté après 30 minutes par le
  mécanisme de tâches planifiées déjà en place.
- Le lead est écrit dans la file de prospection/relance existante, avec entreprise, contact,
  ville, catégories principale et secondaire, identifiants d'audit/session/prospect, plan et prix
  présentés, attribution, étape d'abandon, horodatage, lien de reprise, statut « à contacter ».
- Une seule relance active par dossier ; paiement réussi ensuite → relance fermée et convertie,
  plus aucune notification.
- Une notification courriel à `yturcotte@gmail.com` via le système d'envoi déjà utilisé,
  objet « UNPRO — entrepreneur à relancer : [Entreprise] ».

## 8. Admin et affilié

- Le lead apparaît dans la liste de relance existante. Attribution affiliée conservée si elle
  existe, sinon file admin non assignée.

## 9. Vérification

Parcours complet sur mobile : entrée audit → entreprise trouvée par son site → ville vérifiée
conservée face à une ville déduite → changement de métier principal → ajout puis retrait du
secondaire → 75 / 4 / 3000 affichés correctement → données transportées jusqu'au plan →
paiement en mode test activé sans relance → abandon simulé produisant un seul lead et un seul
courriel → paiement après relance fermant le lead → attribution affiliée intacte.

## Notes techniques

- Réutilisation : `PageAiRecommendationAudit`, `PageMatchingProfileWizard`,
  `PageContractorPricingIntake`, `PageContractorPersonalizedPlan`, fonctions `matching-profile`,
  `create-checkout-session`, `stripe-webhook`, table de catégories de services existante,
  file de relance et envoi courriel existants.
- Aucune nouvelle table si une table compatible existe ; aucune migration destructive ;
  Stripe reste en mode test ; aucun envoi automatique de SMS ; la seule notification
  automatique ajoutée est l'alerte interne de relance demandée.
- Mise en œuvre par lots vérifiables : (1) entrées + dossier unique + priorité de confiance,
  (2) métiers + champs numériques + scores, (3) cohérence du plan, (4) abandon/relance/admin.
