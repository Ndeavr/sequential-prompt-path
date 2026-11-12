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
- **Décision du 29 octobre 2026 :** l'ouverture commerciale du Checkout Stripe LIVE 350 $ sur le parcours canonique existant est autorisée, sans attendre la clôture de l'audit QA. Cette décision ne prouve ni le déploiement de chaque fonction ni la conformité des droits : ne compter que les paiements réglés, reliés à l'entreprise unique et rapprochés avec webhook signé et droit de 12 mois. Une redirection de succès ne vaut pas paiement.
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

### Distinction des parcours 350 $ — réinspection du source au 1er novembre 2026

- **Chemin canonique source `create-checkout-session` :** le chemin `entryActivation: true` exige un utilisateur authentifié, résout une fiche entreprise et renseigne `offer: entry_activation_350` ainsi que `contractor_id` dans les métadonnées Stripe. **Présence dans le source uniquement :** ni l'Edge déployée ni l'exécution E2E Auth → Stripe TEST → webhook signé → registre → 12 mois/RLS ne sont confirmées. Maintenir les contrôles d'identité, prix/taxes, licence, idempotence et révocation.
- **Écran `src/pages/entrepreneur/activation/ScreenPayment.tsx` :** pour `isFounder`, `handlePay` **redirige maintenant** vers `buildActivation350Links(searchParams).activate`, après mémorisation locale éventuelle du nom d'entreprise. Il **n'invoque plus** le checkout invité dans cette branche UI. La redirection source ne démontre ni un paiement complété ni un droit de 12 mois.
- **Fonction héritée encore présente `create-founder-activation-checkout` :** son code accepte toujours un Checkout invité (auth optionnelle), `allow_promotion_codes: true` et `offer_kind: pack_350`, **sans `contractor_id` Stripe**. Ne pas conclure qu'elle est appelée par l'écran fondateur actuel, ni présumer qu'aucun autre appelant, agent ou ancien déploiement ne l'emploie. Auditer les appels et le déploiement avant toute désactivation ou changement de paiement; aucune activation issue de cette fonction ne satisfait le KPI sans rapprochement Stripe LIVE signé + entreprise unique + droits.
- **Source ≠ CI ≠ déploiement ≠ vente :** réinspection au HEAD `2b4c7b1b5352` de `lovable-sync` le 1er novembre. La correction de l'import condo du webhook apparaît dans le source, mais ne remplace pas la preuve E2E isolée du [P0 #86](https://github.com/Ndeavr/sequential-prompt-path/issues/86). Aucune migration, appel Stripe, activation, communication, dépense ou publication n'est autorisée par cette note.

## 8. Validation de l'objectif hebdomadaire

Chaque rapport UNPRO doit afficher :
- Objectif 3 000; réalisé 350 $ LIVE net; %; écart; jours restants; cadence moyenne requise.
- Nouveaux prospects distincts, vérifications RBQ pertinentes, contacts CASL admissibles, emails/SMS autorisés (avec identifiants fournisseur), activation funnel, analyse/inscription/payment, taux et retour.
- Plan de correction ciblé de la prochaine étape bloquante, avec résultats verifiés / tests et coûts de crédits Lovable.


## 9. Audit d'entonnoir reproductible en lecture seule (29 octobre 2026)

**Usage :** contrôles agrégés sur le backend UNPRO existant, sans modification SQL ni divulgation de coordonnées. Ces requêtes ne prouvent **jamais** un achat à elles seules. Périmètre temporel de la campagne : depuis le 27 octobre 2026 à 00 h au Québec (`2026-10-27T04:00:00+00`; heure d'été à cette date). Exclure les tests et acteurs internes avant de qualifier des sessions. Ne pas assimiler visiteur, événement, session, entreprise ou revenu.

```sql
-- Entonnoir déclaré par canal : événements ≠ inscriptions ≠ paiements.
SELECT
  COALESCE(NULLIF(TRIM(channel), ''), 'non attribué') AS canal,
  COUNT(*) AS evenements,
  COUNT(DISTINCT NULLIF(session_id, '')) AS sessions_distinctes,
  COUNT(DISTINCT contractor_id) AS entreprises_identifiees,
  COUNT(*) FILTER (
    WHERE event_type ILIKE '%register%' OR event_type ILIKE '%signup%'
  ) AS evenements_inscription,
  COUNT(*) FILTER (WHERE event_type ILIKE '%checkout%') AS evenements_checkout
FROM public.contractor_funnel_events
WHERE created_at >= '2026-10-27T04:00:00+00'
  AND COALESCE(is_test, false) = false
  AND internal_reason IS NULL
GROUP BY 1 ORDER BY evenements DESC;
```

Le canal `non attribué` est conservé comme tel ; `source='app'`, les UTM déclarés ou la classe « Direct » de Lovable ne prouvent ni origine commerciale, ni entreprise qualifiée, ni conversion. Les catégories à rapporter séparément sont **affiliés/partenaires, organique, publicité autorisée, prospection conforme, non attribué**. L'absence d'un événement d'inscription ne prouve pas l'absence de tout compte ancien ; ne compter comme nouveau que ce qui est vérifié depuis la date de départ.

```sql
-- Contrôle indicatif des nouvelles traces de monétisation (PAS preuve de ventes).
SELECT 'billing_webhook_events' AS source, COUNT(*) AS traces
  FROM public.billing_webhook_events WHERE received_at >= '2026-10-27T04:00:00+00'
UNION ALL SELECT 'stripe_webhook_events', COUNT(*)
  FROM public.stripe_webhook_events WHERE received_at >= '2026-10-27T04:00:00+00'
UNION ALL SELECT 'contractor_entitlements', COUNT(*)
  FROM public.contractor_entitlements WHERE created_at >= '2026-10-27T04:00:00+00'
UNION ALL SELECT 'contractor_activation_ledger', COUNT(*)
  FROM public.contractor_activation_ledger WHERE created_at >= '2026-10-27T04:00:00+00'
UNION ALL SELECT 'contractor_checkout_sessions', COUNT(*)
  FROM public.contractor_checkout_sessions WHERE created_at >= '2026-10-27T04:00:00+00'
UNION ALL SELECT 'billing_checkout_sessions', COUNT(*)
  FROM public.billing_checkout_sessions WHERE created_at >= '2026-10-27T04:00:00+00'
UNION ALL SELECT 'contractor_recruitment_payments', COUNT(*)
  FROM public.contractor_recruitment_payments WHERE created_at >= '2026-10-27T04:00:00+00';
```

**Réconciliation obligatoire hors SQL :** récupérer Stripe **LIVE**, paginer toutes les transactions pertinentes, vérifier montant **de base avant taxes de 35 000 cents CAD** et règlement, non-remboursement/non-litige ; rapprocher l'identifiant Stripe, le webhook signé authentifié et idempotent, l'identité juridique unique de l'entreprise et son droit de profil **12 mois**. Le seul retour navigateur, `payment_status` CRM, l'existence d'un checkout ou une ligne de droit sans source ne qualifie pas. Une liste Stripe `has_more=true` est partielle, pas un audit historique exhaustif. Compter le revenu net hors taxes et le CAC uniquement après rapprochement de la dépense réellement engagée par canal.

**Preuve du droit de 12 mois — ne pas confondre les tables (audit lecture seule du 4 novembre 2026) :** la fonction SQL `public.contractor_plan_code(_user_id)` est présente sur la base reliée au projet Lovable et correspond à `drizzle/migrations/0023_entry_350_presence_entitlement.sql`. Le plan `presence` y est résolu à partir du **premier** reçu `contractor_activation_ledger.action='entry_activation_350_paid'`, joint au même événement/session dans `stripe_webhook_events` LIVE (session payée, sous-total 35 000 cents CAD), pendant **12 mois calendaires**, sans révocation enregistrée. Le tableau `contractor_entitlements` porte notamment les capacités de matching/rendez-vous : **zéro ligne dans cette table n'est ni une preuve de zéro achat, ni une preuve d'absence du droit `presence`**. Inversement, l'existence de la fonction ou du ledger ne prouve aucune vente admissible. Pour certifier un payeur unique, valider le droit effectif lié à l'utilisateur et à l'entreprise, la charge Stripe LIVE réellement réglée et non remboursée/non contestée, le webhook signé et la révocation, avec identité du backend canonique vérifiée ; à ce contrôle la correspondance indépendante avec `clmaqdnphbndvmmqvpff` demeure non confirmée.

**Échantillon observé le 29 octobre vers 16 h 15 (Montréal), lecture seule :** 177 visiteurs et 227 pages vues Lovable depuis le 27 ; 55 événements commerciaux non marqués test/interne = 24 sessions distinctes, 0 entreprise identifiée, **100 % des sessions non attribuées** ; 0 événement d'inscription et 0 événement checkout dans cette cohorte. Les sept tables du contrôle ci-dessus retournent 0 nouvelle trace depuis le départ. Stripe LIVE liste 91 PaymentIntents au total, dont trois paiements réussis à 1 $, aucun réussi à 350 $ ; les 100 Checkout Sessions les plus récentes affichent `has_more=true` et ne doivent donc pas être décrites comme l'historique complet. **Ventes admissibles réconciliées : 0/3 000, à cette heure.** Cette photographie ne prouve ni que les correctifs GitHub sont déployés, ni qu'une campagne est prête.

**Lecture complémentaire du 31 octobre 2026 (contrôles en lecture seule, non réconciliés Supabase) :** l'analytique Lovable du projet existant, pour la fenêtre UTC `2026-10-27T00:00:00Z` → `2026-10-31T16:30:00Z` (`channelsSource=user_app_events`), rapporte **274 visiteurs et 401 pages vues**. Origines déclarées par Lovable : Direct 262 ; Bing 4 ; Yahoo 3 ; Google 2 ; Gmail Android 1 ; DuckDuckGo 1 ; Gmail web 1. Ce total **n'est pas** un nombre de visiteurs entrepreneurs admissibles, de comptes uniques, de personnes consentantes, de clients qualifiés ou de conversions. « Direct » reste **non attribué commercialement**. Cette fenêtre commence 4 h avant le départ de campagne en heure de Montréal et le 31 octobre est partiel : ne pas la confondre avec une cohorte locale complète ni comparer sans normalisation au relevé du 29 octobre.

Stripe **LIVE** (compte UNPRO) : la liste complète des **91 PaymentIntents** (`has_more=false`) contient **trois paiements réussis de 1 $ CA**, **aucun paiement réussi au prix de base 350 $ CA**; **0 litige** dans la liste des litiges (`has_more=false`). Les **100 Checkout Sessions les plus récentes** (`has_more=true`, donc non exhaustives) datent au plus tard du **28 septembre 2026**; aucune depuis le début de cette campagne dans cette page la plus récente. **0 vente LIVE 350 $ démontrée dans Stripe**; ne pas prétendre à une réconciliation de droits, car l'accès en lecture au projet Supabase `clmaqdnphbndvmmqvpff` est refusé. Inscriptions, checkouts par canal et entitlements restent **indisponibles et non présumés nuls**. Aucun CAC payant vérifié par canal.

**Réalité de distribution au 31 octobre (scénarios, pas prévisions) :** 62 jours calendaires inclusivement jusqu'au 31 décembre, soit **49 entreprises payantes vérifiées/jour** après arrondi supérieur si le total reste à 0. À 5 % de conversion hypothétique des **visiteurs réellement qualifiés** en payeurs, cela impliquerait **980 visiteurs qualifiés/jour** pour soutenir 49 ventes quotidiennes; à 2 %, **2 450/jour**. Les 274 visites Lovable sur cinq dates calendaires dont deux partielles ne prouvent ni la qualité du trafic ni un taux de conversion. Le problème principal est l'absence de ventes admissibles et d'une distribution inbound prouvée. Aucune campagne, envoi, dépense ni déploiement n'est autorisé par cette photographie.

**État d'autorisation inchangé :** rapportage et audit SELECT uniquement ; aucune campagne, signature CASL, message, écriture de production, modification de paiement ou dépense n'est permise par cette section. Le P0 #86 demeure l'autorité de validation du parcours Stripe TEST isolé.

## Contrôle Stripe LIVE — 3 novembre 2026 (lecture seule, aucune opération de paiement)

**Périmètre vérifié :** l'unique compte Stripe LIVE accessible et nommé `unpro.ca`. Requête native Stripe de lecture : toutes les **91 PaymentIntents** (`has_more=false`) et toutes les **4 Charges** (`has_more=false`), plus les **100 Checkout Sessions les plus récentes** (`has_more=true`, donc **pas** un inventaire exhaustif de sessions anciennes). Données personnelles, identifiants de transaction et clés non copiés dans ce rapport.

- **3 PaymentIntents réussies**, chacune de **100 cents CAD (1 $)**, associées à **3 charges réussies de 1 $**, sans remboursement indiqué. Toutes datent des **12 juin, 8 juillet et 13 juillet 2026**, donc avant l'objectif du 27 octobre. **Aucune charge réussie de 350 $ CAD** dans cet inventaire complet du compte. Une quatrième charge historique a échoué.
- Le **plus récent Checkout Stripe visible** a été créé le **27 septembre 2026 à 12:05:13 UTC** ; parmi les 100 plus récentes sessions, aucune n'a été créée du **27 octobre au 3 novembre**. Les anciennes sessions à 350 $ examinées étaient **expirées et impayées**, pas des ventes. Une session créée mais impayée ne prouve ni conversion ni facturation.
- **Résultat financier observable sur CE compte : 0 encaissement Stripe LIVE admissible de base 350 $**. Ce chiffre est une observation de Stripe, **pas** une réconciliation complète des droits/entreprises dans Supabase et **pas** un audit d'autres comptes éventuellement non connectés. Le backend canonique `clmaqdnphbndvmmqvpff` ne figure pas parmi les projets accessibles via le connecteur Supabase ; il est impossible de confirmer les webhooks signés, l'entreprise unique et les droits de 12 mois avec ce seul accès.
- **Signal P0 de distribution/parcours** : aucune nouvelle session checkout dans ce compte depuis septembre, malgré la cible fondatrice du 27 octobre. Investiguer *en lecture seule* l'identité du compte recevant les sessions du parcours canonique, la visibilité réelle du bouton d'activation, les retours d'erreur de création de checkout, et les événements premier-partie par canal avant d'attribuer une cause. Ne **pas** déduire que le checkout est défectueux simplement d'une absence de sessions.
- **Acquisition Lovable pour la période 27 oct.–3 nov.** : 496 visiteurs et 722 pages vues agrégés ; **18 vues** de `/entrepreneurs/activation-350`, **214 visiteurs géolocalisés au Canada**. Les 474 visiteurs « Direct » ne sont pas 474 prospects organiques qualifiés. Affiliation/partenaires, organique, publicité autorisée et sollicitation conforme : inscriptions, checkouts complétés, payeurs 350 $ et CAC **non attribuables avec les seules statistiques de visite**.
- Si ce compte est effectivement l'unique compte de perception admissible, le **rythme calculé sur 59 jours calendaires (3 nov.–31 déc. inclus) depuis zéro encaissement de base** serait **3 000 / 59 = 50,85, soit au moins 51 nouveaux payeurs vérifiés par jour**. Ne pas transposer ce scénario conditionnel à une mesure d'entreprises payantes réconciliées.

**Aucune action de production autorisée par cet audit :** ni ouverture de flags, création de checkout, charge, migration, campagne, SMS ou courriel. L'[issue P0 #86](https://github.com/Ndeavr/sequential-prompt-path/issues/86) reste ouverte pour l'E2E Auth/Stripe TEST isolé ; une fusion GitHub ne démontre aucun déploiement.


## 2026-11-06 — chemin 350 $ et destination de prospection (audit SOURCE, non déployé)

**Révision vérifiée :** \`lovable-sync\` \`e9bdbb9bd151\` ; Lovable indiquait ce SHA. **État : lecture de source seulement**, aucune preuve de version publiée des Edge Functions. Aucun message, paiement, publicité, migration, déploiement ou crédit Lovable.

### Route publique 350 $ : branche réellement appelée

- \`src/app/router.tsx\` relie \`/entrepreneurs/activation-350\` à \`src/pages/entrepreneur/PageActivation350.tsx\`. Les CTA restent sur la même page avec \`?activate=1\` via \`src/lib/activation350Links.ts\`; ils rendent \`src/components/entrepreneur/Entry350FastCheckout.tsx\`. La description d'en-tête historique dans la page (« devis-personnalise ») n'est **pas** le chemin du CTA actuel.
- \`Entry350FastCheckout.begin()\` demande un nom **déclaré** d'entreprise (au moins deux caractères), transmet à l'authentification entrepreneur avec reprise si nécessaire, puis invoque \`create-checkout-session\` avec **\`entryActivation: true\`**, \`declaredCompanyName\` et l'attribution compatible ; **pas de \`quoteId\` imposé**. Retour « success » seulement informatif, jamais preuve de paiement.
- \`supabase/functions/create-checkout-session/index.ts\` traite explicitement \`entryActivation === true\` **avant** le chemin abonnement nécessitant \`quoteId\` ; il crée un Stripe Checkout \`mode: "payment"\` à **35 000 cents CAD hors taxes** avec les taxes québécoises applicables et \`metadata.offer = "entry_activation_350"\`, \`contractor_id\`, \`entry_tax_contract\`. Il utilise \`STRIPE_SECRET_KEY\` pour LIVE, \`STRIPE_TEST_SECRET_KEY\` uniquement sous garde QA. Le garde métier valide un nom déclaré/fiche appartenant à l'utilisateur. **Le \`quote_required\` de la branche abonnement ne prouve donc pas une panne du checkout d'entrée.** Ne pas altérer abonnements ou promotions 1 $.
- \`supabase/functions/stripe-webhook/index.ts\` comporte un chemin spécial \`entry_activation_350\` exigeant \`payment_status = paid\` et le sous-total 35000 CAD avant reçu durable \`entry_activation_350_paid\`; des E2E Auth/Stripe TEST signés, fiscalité, RLS, idempotence, remboursements et droits 12 mois restent non démontrés. PR #192 (routage invité/fondateur) et #197 (télémétrie « complete » ≠ « paid ») sont des drafts anciens : ne pas fusionner sans rebase, CI et vérification isolée.

### Écart démontré dans le code de prospection : courriel à 350 $ → revendication gratuite

- \`supabase/functions/send-verified-batch/index.ts\`, \`ensureActivationLink()\` fabrique \`/unpro/activate/:token\` ; la branche courriel utilise \`EMAIL_HTML(..., link)\` et le modèle \`acquisition_activation_350_v1\`, dont le texte présente **350 $** (\`_shared/offerCopy.ts\`). Or \`src/app/router.tsx\` rend à cette URL \`PageUnproActivate\` → \`ActivationClaimPanel\`, dont le bouton affiche **« Activer mon profil gratuitement »** et invoque **\`activation-claim\`**, sans créer de session Stripe. C'est un **écart de promesse et de destination dans la SOURCE** ; ne pas compter une revendication de fiche ni l'événement \`profile_activated\` comme achat 350 $. L'effet sur les vrais courriels livrés n'est **pas vérifié** ; la preuve CASL et la livraison restent distinctes. Ne pas modifier ni envoyer ces modèles en production tant qu'une destination 350 $ liée au jeton et à l'entreprise n'est pas validée.
- La branche SMS ordinaire du même worker substitue \`/unpro/audit/:token\`, qui redirige vers \`/entrepreneurs/audit-ia\` avec prospect et attribution ; le CTA audit mène ensuite à \`/entrepreneurs/profil\`, **pas directement au Checkout 350 $**. Certaines campagnes 12 mois gratuits constituent un parcours distinct et ne satisfont pas le KPI payant. Les URL envoyées par **d'autres** workers/automatisations et les destinations effectivement reçues ne sont pas certifiées par cet audit ; le propriétaire de la prospection conserve son test limité à dix entreprises distinctes, sans nouveaux envois ici.
- Le code de \`PageUnproActivate\` peut afficher des nombres de « places gratuites restantes » et une « liste d'attente ». **Ne pas faire une annonce de rareté** sans rapprochement frais de la capacité, demande qualifiée, engagements et droits ; aucun nombre réel n'est établi par ce constat source.

### Expérience marketing PROPOSÉE — ni lancée ni publiée

- **H1 A :** « Choisissez les contrats que vous voulez. Pas ceux qu'on vous impose. »
- **H1 B :** « Tanné de courir après des clients qui ne vous conviennent pas? »
- **CTA identique pour les deux :** « Analyser mon entreprise ». Séquence identique : aperçu privé des services et du territoire, Clara demande les précisions manquantes, puis prix exact **350 $ + taxes / 12 mois UNPRO**, explicitement **aucun rendez-vous inclus**. Exemple simulé étiqueté comme tel, aucune fausse disponibilité, licence ou recommandation.
- Assigner la variante de façon stable, exclure QA et trafic non qualifié ; mesurer **visiteurs uniques qualifiés → analyse terminée → inscriptions vérifiées → checkouts complétés → paiement Stripe LIVE réglé / entreprise unique / webhook signé / droit 12 mois**, par canal affilié, organique, média expressément autorisé et prospection conforme. Éviter le ratio 4 CTA / 12 checkouts issu de cohortes hétérogènes. Aucun gagnant, CAC ni abandon démontrés.

**Vérification Stripe séparée (lecture seule, 6 novembre) :** compte connecté \`acct_19AhHrCvZwK1QnPV\` : liste exhaustive de **91 PaymentIntents** (\`has_more=false\`), seulement trois réussis à **100 cents**, aucun à **35000 cents** ; les 100 Checkout Sessions les plus récentes sont antérieures au 27 octobre. **La clé secrète réellement configurée dans l'Edge déployée n'est pas visible**, et rien ne prouve qu'elle est liée à ce compte connecté. Le Supabase canonique \`clmaqdnphbndvmmqvpff\` refuse l'accès indépendant ; absence de preuve de droits, pas certification globale de zéro vente.

**Prochaine porte technique :** cibler l'écart exact du lien courriel 350 $ et préserver le jeton dans un handoff **authentifié/validé côté serveur** vers l'offre payante ; avant toute édition de production, vérifier quel worker envoie réellement, dédoublonnage/STOP/CASL, bonnes identités, tests synthétiques de retour, Stripe TEST signé et absence de doubles droits. Garder l'option gratuite distincte si elle est commercialement maintenue, sans la présenter comme un achat.
