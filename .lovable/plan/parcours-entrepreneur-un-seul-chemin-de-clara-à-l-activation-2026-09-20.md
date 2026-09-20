# Parcours entrepreneur — un seul chemin, de Clara à l'activation

Objectif : rendre le parcours entrepreneur continu et vérifiable, de la page d'accueil jusqu'à l'activation du forfait, en réparant ce qui existe déjà. Aucun nouveau parcours, aucune nouvelle page, aucune nouvelle table.

## Ce qui existe déjà et sera réutilisé

- Transition conversationnelle « Je suis entrepreneur » (texte et voix) — fonctionnelle.
- Recherche/préremplissage d'entreprise et audit : page « devis personnalisé ».
- Tableau de tri des services (Prioritaire / Accepté / Non recherché) avec glisser-déposer.
- Objectifs entrepreneur, plan personnalisé calculé côté serveur, paiement Stripe en mode TEST, webhook d'activation, tableau de bord entrepreneur.
- Journal d'événements de tunnel unique (une seule table, déjà en place).

## Le vrai problème

Aujourd'hui la transition Clara mène à un formulaire vide où l'entrepreneur doit tout retaper, alors que l'analyse d'entreprise, le préremplissage et l'audit existent plus loin dans le parcours. Les étapes sont bonnes mais mal chaînées, et plusieurs abandons ne sont pas mesurables.

## Ce qui sera fait

1. **Entrée unique après Clara**
   La transition ouvre l'analyse d'entreprise (recherche par nom, site Web, fiche Google) au lieu du formulaire vide. La session Clara et l'intention entrepreneur sont conservées. Le formulaire manuel reste accessible comme secours : « Mon entreprise n'est pas listée ».

2. **Analyse et conversion**
   Affichage du score de visibilité, de ce qui manque, des occasions détectées et d'un appel à l'action unique. Chaque information affichée porte sa provenance (Vérifié / Déclaré / Inféré / À confirmer). Rien n'est inventé : si une donnée n'est pas trouvée, elle est marquée « à confirmer » plutôt que remplie.

3. **Profil prérempli**
   Logo, téléphone, courriel, site, ville/territoire, description, avis, licences repris de l'analyse. L'entrepreneur confirme ou corrige, il ne retape pas.

4. **Services reliés au métier réel**
   Le tableau Prioritaire / Accepté / Non recherché est alimenté uniquement par les services déduits du métier détecté, avec champ de recherche et ajout par Entrée. Aucune catégorie hors métier proposée.

5. **Code de vérification (OTP)**
   Le flux est préparé et instrumenté de bout en bout. Après vérification, le parcours reprend exactement à l'étape en cours, sans reposer de questions.

6. **Objectifs puis plan personnalisé**
   Nombre de contrats visés, valeur/type, territoire, capacité, préférence petits/gros/mixte, disponibilités — une question à la fois avec Clara. Le plan est calculé à partir de ces réponses, côté serveur, et n'envoie jamais vers les forfaits propriétaires.

7. **Paiement en mode TEST uniquement**
   Vérification du bon forfait, du bon prix, des codes promo, du retour de paiement, du webhook, de l'activation et de l'état du compte. Aucune transaction réelle.

8. **Après activation**
   Le tableau de bord doit montrer profil, forfait, services, territoire, calendrier, rendez-vous, recommandations de visibilité et la prochaine action.

9. **Mesure des abandons**
   Les douze points demandés (clic accueil, analyse démarrée/terminée, profil démarré/terminé, OTP demandé/vérifié, objectifs terminés, plan vu, paiement démarré/terminé, compte activé) sont journalisés dans le journal de tunnel déjà existant, avec le même identifiant de session du début à la fin.

## Détails techniques

- Réutilisation : `claraNavigation` (cible entrepreneur), `PageContractorPricingIntake` (recherche + préremplissage), `ServiceTriageBoard`, `PageActivationGoals`, `compute-pricing-quote`, `PageContractorPersonalizedPlan`, `create-checkout-session`, `stripe-webhook`, `PageEntrepreneurDashboardLite`.
- Instrumentation via `src/lib/analytics/logFunnelEvent.ts` : ajout des seuls noms manquants au type existant (`home_contractor_click`, `contractor_analysis_started/completed`, `contractor_profile_started/completed`, `contractor_goals_completed`, `personalized_plan_viewed`) ; les autres (`otp_requested`, `otp_verified`, `checkout_started`, `payment_completed`, `contractor_activated`) existent déjà et seront réutilisés tels quels.
- Redirections : `/entrepreneur/onboarding` conserve sa route ; son contenu devient l'étape d'analyse avec repli formulaire, sans créer de route parallèle.
- Aucune migration destructive. Aucune clé Stripe live. Aucun envoi automatique de SMS/courriel.

## Vérification

- Tests unitaires et de régression, typage, lint, build.
- Parcours automatisé à 390 px jusqu'à l'étape OTP, captures à chaque étape.
- Vérification en base que les douze événements s'écrivent avec le même identifiant de session.
- Paiement test complet (carte de test) avec contrôle du webhook et de l'activation.

## Point d'arrêt prévu

Seule l'étape du code de vérification exige un vrai téléphone. À ce moment précis je m'arrête et je fournis : l'URL exacte à ouvrir, l'action à faire, et ce que je vérifie immédiatement après.
