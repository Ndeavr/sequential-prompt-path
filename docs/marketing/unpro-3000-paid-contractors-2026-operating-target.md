# UNPRO — 3 000 entrepreneurs et professionnels PAYANTS avant le 31 décembre 2026

**Décision fondateur :** 27 octobre 2026. **État : OBJECTIF COMMERCIAL, NON PRÉVISION.**
**Périmètre :** 3 univers UNPRO (rénovation/construction, entretien/services aux immeubles, immobilier et professionnels), Québec en priorité, élargissement hors Laval à l'échelle provinciale. Réutiliser l'application, Clara, le CRM, l'activation 350 $ et les contrôles actuels. Aucune nouvelle plateforme ni réinitialisation de file. 
**Date butoir :** 31 décembre 2026 (66 jours calendaires du 27 octobre au 31 décembre inclus).

## 1. Contrat métrique
- KPI nord : **3 000 entreprises UNIQUES ayant réellement payé l'activation au prix de base de 350 $ CA hors taxes**, reliées à la bonne entité légale/compte, avec preuve Stripe LIVE de paiement réglé, webhook signé et droits de profil/12 mois matérialisés. Dédupliquer les tentatives/réémissions et exclure remboursements, litiges, transactions de 1 $, promo 1 $, données TEST, étiquettes CRM « paid », simples checkouts commencés et revenus d'abonnement antérieurs.
- **Recettes d'activations théoriques : 1 050 000 $ CA hors taxes**, sous hypothèse des 3 000 activations à 350 $ réellement perçus sans réduction ni remboursement. Pas un revenu enregistré aujourd'hui ni un EBITDA.
- Si toutes les taxes TPS/TVQ Québec sont applicables, le total de prix 402,41 $ par activation représenterait **1 207 230 $ encaissés taxes comprises**, dont les taxes ne sont pas le revenu propre d'UNPRO. Ne jamais mélanger ces montants.
- Vitesse linéaire depuis 0 : **45,45 activations vérifiées par jour**, arrondir cible opérationnelle à **46/jour**, **318/semaine**. Les deux premières ventes ne sont qu'un test du canal et du paiement, PAS la cible de lancement.
- Baseline source vérifiée aux derniers audits : **aucun paiement unique LIVE 350 $ suffisamment rapproché Stripe/webhook/droits**. Revalider avant tout communiqué; les états historiques « paid » ou Stripe 1 $ ne qualifient pas.
- Inclure les professionnels au-delà de la rénovation, avec vérification réglementaire adaptée au métier. Ne pas imposer RBQ si non requise; ne jamais recommander un entrepreneur dont la licence nécessaire est invalide/suspendue.

## 2. Faisabilité — le véritable problème est la distribution

L'actuel **plafond sécurité SMS de 25/jour** ne peut pas être le moteur principal de ce but : au plus 1 650 contacts distincts sur 66 jours, ce qui reste inférieur à 3 000 PAYEURS même avec un taux de conversion irréaliste de 100 %. Ce plafond reste inchangé pour protection CASL/STOP. Ne pas ouvrir les 115 701 anciens messages sans idempotence et consentement.

### Volume de trafic nécessaire (scénarios, non taux mesurés)

| Taux visiteur qualifié → entreprise payante vérifiée | Visiteurs uniques qualifiés sur la période | Moyenne par jour |
|---:|---:|---:|
| 1 % | 300 000 | 4 545 |
| 2 % | 150 000 | 2 273 |
| 5 % | 60 000 | 909 |
| 10 % | 30 000 | 455 |

Ce sont des mathématiques de cohorte, non des prévisions. Un taux de 10 % sur le trafic froid ne doit jamais être supposé. **L'inventaire initial de 955 prospects ne saurait suffire** à lui seul; il faut élargir la demande admissible et choisir les canaux selon les résultats réellement payés.

Le marché potentiel existe mais ne garantit pas 3 000 achats : RBQ 2024–25 déclarait 53 662 licences actives incluant constructeurs-propriétaires et licences délivrées par corporations; *licences ≠ sociétés uniques adressables*. Statistique Québec déc. 2025 : 278 816 entreprises ayant employé au moins une personne, dont construction 13,7 % et services professionnels/scientifiques/techniques 10,7 %. *Ces secteurs ne sont pas tous le marché résidentiel UNPRO*. Sources : https://www.rbq.gouv.qc.ca/fileadmin/medias/pdf/Publications/francais/rapport-annuel-2024-2025.pdf et https://statistique.quebec.ca/fr/document/nombre-entreprises-actives-quebec

## 3. Acquisition multi-canal — ne pas dépendre des SMS

**Quatre systèmes compatibles et mesurables, par priorité commerciale :**

1. **Affiliés/partenaires et associations** (pros du bâtiment, fournisseurs de matériaux, réseaux de courtiers, inspecteurs, syndics, réseaux entretien) : lien identifiable, aucun partage non consenti des coordonnées, règles de commissions affichées et attribution Stripe vérifiée. L'affilié amène des entreprises volontairement; seul UNPRO facture l'activation. Pas de faux témoignages ni promesses.
2. **Distribution organique et invitations dans un flux volontaire** : audits gratuits, pages métier/territoire qualitatives, vidéos courtes FR-QC, partenaires affichant un lien UNPRO; SEO/AEO fondé sur données vérifiables, aucune garantie de recommandation de la part de ChatGPT/Google.
3. **Publicités de conversion avec budget expressément approuvé** (Meta/Google/YouTube) : campagnes par métier et segment, landing à un champ, aperçu du profil avant paiement; mesurer revenu effectivement payé. Aucun budget ni campagne activés sans autorisation, fixer un CAC maximal après coût de prestation/commission/transaction.
4. **Prospection directe conforme LCAP/CASL** : preuves de contacts de première partie automatiquement capturées en attente; une personne autorisée confirme la base légale; statut mobile/STOP/doublons vérifiés. Le quota 25 SMS/jour reste un pilote faible volume, pas la stratégie pour 3 000 ventes.

Ne pas envoyer un SMS à un numéro professionnel simplement parce qu'il figure en ligne. Préférer pages d'inscription volontaire, partenaires et audiences inbound pour volume. Ne pas utiliser fichiers d'annuaires achetés avec sollicitations massives.

## 4. Offre commerciale — convertissez sans inventer de rendez-vous
La promesse principale n'est pas « plus de leads », mais :
**« Choisissez les contrats que vous voulez. Pas ceux qu'on vous impose. »**
- Première action sans paiement : identifier votre site / entreprise / NEQ / RBQ selon métier, afficher un aperçu fiable et les prestations/territoires reconnus.
- Clara demande les nuances utiles, une question à la fois, conserve les réponses; pas de formulaires mensuels non pertinents ni de reprise après login.
- Activation de base : **350 $ + taxes applicables, paiement unique, profil UNPRO et présence pendant 12 mois**; ne promettre aucun rendez-vous inclus si non prévu par les droits de l'offre. Les rendez-vous exclusifs sont une option séparée, avec droits connus avant paiement.
- Permettre le paiement via Stripe LIVE uniquement après validation du parcours, taxes et droits; confirmer par webhook signé. Une redirection de succès ne vaut pas paiement.
- Aucune fausse urgence (« 10 places restantes »), aucun faux volume clients/reviews, aucun score IA inventé.

## 5. Tableau de bord exécutif minimal

### Entonnoir dans cet ordre et avec unités distinctes
`discoverable businesses → eligible businesses → legally reachable distinct recipients → reached/delivered → unique visitors → analyses started → analyses completed → registrations → checkout started → Stripe LIVE settled $350 → entitlements confirmed → paid unique contractors (net of refunds)`.

**Par canal/variante/métier/territoire** : uniques, taux de progression, coût, CAC reconnu, commissions d'affiliés, revenu net hors taxes, remboursements/désabonnements, raisons d'abandon, licence vérifiée/déclarée. Séparer visites des bots, tests/admin et trafic réel. Utiliser les tableaux et `logFunnelEvent` existants, pas d'analytics parallèles.

### Intégrité des canaux d'acquisition (ne pas inventer de conversions)

- Dans `contractor_funnel_events`, `source` et `event_source` décrivent le **producteur technique** (`app`, `webhook`, etc.), **pas** le canal marketing. Une source `app` n'est ni une preuve de trafic organique ni une preuve de publicité.
- `channel` NULL doit être présenté comme **« non attribué »**. `utm_source`, `utm_medium` et `affiliate_code` indiquent seulement une origine **déclarée** par un lien ou une session, pas un partenaire certifié, une dépense autorisée, une commission due ni une vente. Sans UTM, ne pas inférer « direct »; seules des données de référence vérifiables permettent d'affiner l'attribution.
- Écarter des cohortes commerciales les événements `is_test = true` et `internal_reason IS NOT NULL`. Compter les événements, sessions uniques et entreprises distinctes dans des colonnes **séparées** : une session, un clic et un client payant ne sont pas interchangeables. Rapporter explicitement le taux de sessions non attribuées.
- Un achat **350 $ payé par canal** exige le rapprochement serveur de Stripe LIVE réglé, l'événement webhook authentifié, l'identité unique de l'entreprise, les droits de 12 mois et l'absence de remboursement/litige. L'UTM ou un statut CRM seuls ne suffisent jamais. Le CAC par canal requiert en plus les dépenses/commissions effectives et autorisées.

**Alertes d'exploitation** : 0 vrai paiement en 48 h après une campagne autorisée; échec paiement/webhook/droit 12 mois; blocage login/CTA; consentement sans preuve; doublons/erreurs DB; SMS non livrés; CAC dépassé; déploiement qui ne correspond pas au SHA validé.

### Portes de progression — pas de promesse de ventes inventées
- **Gate 0** : premier paiement réellement réconcilié, puis deuxième, test QA Stripe signé, annulation/échec/prix corrects.
- **Gate 1** : 10 activations uniques; identifier canal, taux d'achèvement, raisons d'échec; développer 3 segments.
- **Gate 2** : 100 activations uniques et confirmation des coûts de service et CAC; au moins 2 canaux indépendants réellement payants.
- **Gate 3** : cadence nécessaire vers 3 000 par 31 décembre, optimisée sur revenu plutôt que clics; renforcer capacité support/finance/qualité sans inventer des scores.

## 6. Test A/B : séquence et non explosion de tests

Voir `docs/marketing/2026-10-acquisition-entrepreneurs-professionnels-ab.md` et `2026-10-contractor-ab-variants.json`.
- **Test 1** une seule variable : « Choisissez les contrats… » vs « Tanné de courir après… », avec même parcours, prix, CTA et protections.
- **Test 2** après conclusion : aperçu de profil vs description des clients idéaux avant le prix.
- **Test 3** après conclusion : deux explications véridiques de la valeur à 350 $.
- Début de test après instrumentation d'une **vraie cohorte** et parcours sécurisé; jusqu'aux premières conversions, apprendre qualitativement sans proclamer des « gagnants statistiques ». Ne jamais annoncer un uplift sans données.
- KPI principal : **entreprises uniques réellement payées à 350 $**, pas un clic, un score IA ou un résultat Google.

## 7. Ordre d'exécution GitHub-first et frontière de publication

1. Corriger le blocage de migration de l'agent CASL first-party **staged** (PR #61 mergée), réaliser la migration Cloud ultra-ciblée seulement avec backup, autorisation et contrôle; agent sauvegarde preuve en attente et ne signe jamais `reviewer_id`.
2. Corriger conflit téléphones source (#56, PR #62 fusionnée), contrôler intégrité avant publication Edge; corriger auth cron #45 via code staged (#63 fusionnée), **sans changer les gates**.
3. Finir parcours inscription → aperçu → Stripe 350 + taxes → webhook signé → droits 12 mois, remboursement / retour auth / CRM atomique; pas de paiement factice.
4. Vérifier que les textes live n'affichent aucune fausse garantie/avis/résultat; conserver Clara et trois univers.
5. Installer le seul A/B de landing sur les pages existantes avec attribution et métriques minimales; aucun lancement coûteux sans CAC mesuré.
6. Développer partenaires/affiliés, organique et campagnes payées soumises au budget explicitement autorisé; canal SMS autorisé séparément.

**Statuts et interdits :** OBJECTIF 3 000 ≠ PLAN TESTÉ ≠ COMMERCIALISATION ≠ REVENUS. Aucun envoi, déploiement, dépense ni écriture production est autorisé par ce document. Chaque étape production nécessitant droit/budget/change gate reste conditionnée à sa vérification réelle.

## 8. Validation de l'objectif hebdomadaire

Chaque rapport UNPRO doit afficher :
- Objectif 3 000; réalisé 350 $ LIVE net; %; écart; jours restants; cadence moyenne requise.
- Nouveaux prospects distincts, vérifications RBQ pertinentes, contacts CASL admissibles, emails/SMS autorisés (avec identifiants fournisseur), activation funnel, analyse/inscription/payment, taux et retour.
- Plan de correction ciblé de la prochaine étape bloquante, avec résultats verifiés / tests et coûts de crédits Lovable.
