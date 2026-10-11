# UNPRO — Pipeline DNA, apprentissage et contenu

**Statut :** À faire — initiative différée, documentation seulement  
**Priorité qui prévaut :** obtenir la première puis la deuxième activation entrepreneur réellement payée à 350 $, avec acquisition, onboarding, Stripe, activation et observabilité opérationnels.  
**Déclencheur :** démarrer P1 après ces ventes, ou seulement si le travail est strictement isolé et sans impact sur ce parcours commercial.  
**Interdiction actuelle :** aucune nouvelle table, fonction, page, automatisation, campagne, vidéo, migration ou modification du produit dans le cadre de cette initiative.

## 1. Objectif

Construire, par étapes, une mémoire de compatibilité canonique qui transforme les commentaires naturels des propriétaires et entrepreneurs en signaux nuancés, vérifiables et corrigibles. Utiliser ces signaux après les barrières métier obligatoires pour expliquer de meilleurs jumelages, apprendre des vrais rendez-vous et résultats, puis créer du contenu promotionnel fidèle à ces irritants réels.

Le système doit préserver le principe UNPRO : une recommandation compatible et expliquée, jamais un partage de prospect ni une personnalité inventée.

## 2. Inventaire existant à vérifier avant toute construction

Reconnecter et auditer l’existant avant de créer quoi que ce soit :

| Élément existant | Statut documentaire |
|---|---|
| `homeowner_compat_dna` | Existant à vérifier |
| `homeowner_memory_events` | Existant à vérifier |
| `contractor_memory_events` | Existant à vérifier |
| `adaptive_question_bank` | Existant à vérifier; 20 questions observées ponctuellement |
| `recommendation_explanations` | Existant à vérifier |
| `appointment_feedback` | Existant à vérifier |
| `homeowner_qualification_graph` | Existant à vérifier |
| `contractor_compatibility_profiles` | Existant à vérifier; 2 profils observés ponctuellement |
| `alex_learning_feedback` | Existant à vérifier |
| `alex_predictive_matches` | Existant à vérifier |
| `alex_recommendation_decisions` | Existant à vérifier |
| `supabase/functions/alex-memory-extract` | Existant à vérifier et reconnecter |
| `src/hooks/useHomeownerDNA.ts` / `recordMemoryTurn` | Existant à vérifier et reconnecter |
| `src/components/matching/MatchCompatibilityCard.tsx` | Existant à vérifier |
| `compat_memory_engine_v1` | Feature flag existant à vérifier |
| `/admin/memory-health` | Surface existante à vérifier |

Constat ponctuel fourni le 11 octobre 2026, à revalider avant décision : événements propriétaire/entrepreneur = 0; explications = 0; feedback de rendez-vous = 0; profils DNA propriétaire = 0; banque adaptative = 20; profils de compatibilité entrepreneur = 2. Ces nombres ne garantissent pas l’état futur.

Consulter aussi `.lovable/memory/features/compatibility-memory-engine.md` : les points d’extension y sont explicitement non câblés. Auditer la divergence de noms Clara/Alex; Clara reste l’identité publique, tandis que les identifiants techniques rétrocompatibles peuvent rester `alex*`. Ne pas dupliquer les systèmes pour renommer.

## 3. DNA matching conversationnel

Clara recueille les signaux utiles en français québécois et en anglais depuis le texte, la voix, l’onboarding et les échanges ultérieurs. Elle privilégie les commentaires libres et ne transforme pas la conversation en questionnaire imposé.

Pour chaque tour pertinent, enregistrer dans la bonne entité :

- signal reconnu et valeur normalisée;
- interprétation prudente, jamais catégorique;
- portée `temporary` ou `long_term`;
- provenance, source et horodatage;
- consentement ou base d’utilisation applicable;
- niveau de confiance;
- statut `DECLARED`, `VERIFIED`, `INFERRED` ou `PENDING`;
- question de clarification uniquement si l’ambiguïté peut modifier la recommandation, la sécurité ou une contrainte essentielle.

Règles : ne pas répéter une question déjà répondue; ne pas inventer une réponse; permettre confirmation, correction, suppression et opt-out. Une correction explicite remplace la valeur précédente avec une trace d’audit.

Exemples de nuance :

- « J’haïs ça aller à Montréal » indique une préférence de territoire ou une faible tolérance au déplacement; confirmer avant d’en faire une exclusion absolue.
- « J’aime pas quand le client me surveille » indique un besoin d’autonomie et une cadence de suivi à clarifier; ne pas stigmatiser le client.

## 4. Banque de 20 exemples/semences

Ces phrases servent de semences symétriques, pas de diagnostics ni de scores automatiques.

| # | Côté | Signal libre | Dimensions DNA | Clarification utile seulement si nécessaire |
|---:|---|---|---|---|
| 1 | Entrepreneur | Trafic / Montréal | territoire, déplacement, logistique | « Souhaitez-vous éviter Montréal ou limiter certains horaires? » |
| 2 | Entrepreneur | Client regarde par-dessus l’épaule | autonomie, implication, communication | « Quel niveau de suivi vous convient sans nuire au travail? » |
| 3 | Entrepreneur | Client silencieux puis critique sur Facebook | feedback, résolution de conflit, communication | « Préférez-vous des validations écrites à quelles étapes? » |
| 4 | Entrepreneur | Chasse au moins cher | budget, valeur, qualité | « Quels compromis refusez-vous pour réduire le prix? » |
| 5 | Entrepreneur | Trop de questions | communication, autonomie, pédagogie | « Quel rythme de questions ou de bilan est efficace pour vous? » |
| 6 | Entrepreneur | Trois gros travaux plutôt que quinze petits | taille de projet, capacité, rentabilité | « Quel minimum de projet s’applique réellement? » |
| 7 | Entrepreneur | Changements d’idée constants | gestion des changements, décision, contrat | « Comment souhaitez-vous confirmer les changements? » |
| 8 | Entrepreneur | Veut confiance et autonomie | implication, confiance, communication | « Quelles étapes doivent quand même être approuvées? » |
| 9 | Entrepreneur | Préfère maisons vides / accès facile | occupation, accès, logistique | « Est-ce une préférence ou une contrainte incontournable? » |
| 10 | Entrepreneur | Urgences si rentables | urgence, disponibilité, minimum financier | « Quelles urgences et conditions acceptez-vous? » |
| 11 | Propriétaire | Une semaine promise, trois semaines réelles | délai, fiabilité, planification | « Le délai ou la transparence sur l’échéancier est-il prioritaire? » |
| 12 | Propriétaire | Entrepreneur silencieux deux jours | fréquence de suivi, rassurance | « À quelle fréquence voulez-vous des nouvelles? » |
| 13 | Propriétaire | Questions sans condescendance | pédagogie, respect, communication | « Souhaitez-vous comprendre chaque décision ou seulement les étapes clés? » |
| 14 | Propriétaire | Télétravail, bruit, réunions | occupation, bruit, horaire | « Quelles plages doivent rester calmes? » |
| 15 | Propriétaire | Pression commerciale pour signer | rythme de décision, confiance | « Avez-vous besoin d’un délai minimal avant de décider? » |
| 16 | Propriétaire | Qualité plutôt que prix minimum | qualité, budget, durabilité | « Quelles qualités ou finitions sont incontournables? » |
| 17 | Propriétaire | Veut photos et mises à jour | communication, documentation, implication | « À chaque étape ou seulement aux jalons importants? » |
| 18 | Propriétaire | Extras surprises | transparence, changements, budget | « Voulez-vous approuver tout extra avant exécution? » |
| 19 | Propriétaire | Perfectionniste sur les finitions | qualité, tolérance, inspection | « Quelles finitions exigent votre validation? » |
| 20 | Propriétaire | Propreté en fin de chantier | propreté, organisation, attentes de livraison | « Attendez-vous un nettoyage quotidien ou final? » |

## 5. Questionnaire volontaire

Ajouter ultérieurement une entrée « Améliorer mes recommandations » au profil propriétaire et « Mieux connaître ma clientèle idéale » au profil entrepreneur.

- 5 à 7 questions adaptatives courtes, une à la fois;
- auto-enregistrement, passer, retour et reprise;
- préremplissage des signaux déjà appris;
- confirmation ou modification explicite;
- aucune note artificielle;
- alimentation de la même mémoire canonique que Clara, sans table ou profil parallèle;
- jamais obligatoire pour l’activation à 350 $ ni pour une demande propriétaire.

## 6. Pipeline d’apprentissage effectif

```text
Conversation
→ extraction structurée
→ mémoire canonique
→ sélection de la prochaine question utile
→ barrières métier obligatoires
→ recommandation expliquée et traçable
→ rendez-vous exclusif réel
→ feedback des deux côtés
→ issue réelle du projet
→ analyse agrégée
→ ajustement contrôlé des règles et questions
```

Les barrières métier précèdent toujours la compatibilité : licence RBQ/CMEQ/CMMTQ lorsque requise, spécialité, territoire, budget, disponibilité et contraintes incontournables. Une licence obligatoire invalide ou non vérifiable bloque la recommandation, même avec une forte compatibilité déclarée.

L’issue peut inclure : rendez-vous tenu, devis, contrat, délai, problème documenté et satisfaction. Ne pas pénaliser sur une plainte isolée, un commentaire subjectif ou une absence de feedback. Ne pas attribuer de causalité sans données suffisantes.

Commencer avec des règles transparentes. Autoriser une repondération expérimentale seulement après échantillon suffisant, validation humaine, comparaison mesurable, limites explicites, journal d’audit, feature flag et rollback vérifié.

## 7. Voix asynchrone et sécurité

Permettre à terme des échanges naturels fragmentés — deux minutes maintenant, trois minutes plus tard — dans la même session. Préserver le curseur et ne jamais répéter les questions déjà répondues.

- contrôle explicite début / pause / fin;
- consentement micro contextuel;
- texte et audio accessibles;
- aucune boucle de relance automatique au silence;
- aucun enregistrement permanent non consenti;
- ne jamais promouvoir la manipulation d’un écran en conduisant;
- proposer un mode vocal sans manipulation uniquement lorsque légal et sécuritaire, idéalement à l’arrêt ou stationné;
- aucune publicité ou interface n’incite à l’inattention routière.

## 8. Série de contenu promotionnel différée

**Statut :** concepts et scripts à produire plus tard; aucune vidéo à générer ou publier maintenant.

Format de chaque vidéo : 15–20 secondes, français québécois.

1. **0–5 s :** personnage frustré, voix 1, ouverture « J’haïs ça… ».
2. **5–17 s :** avatar compact du fondateur et sa vraie voix autorisée : « Chez UNPRO, on comprend que… ».
3. **17–20 s :** logo UNPRO officiel, `unpro.ca`, CTA concis.

Concepts propriétaires : délai annoncé 1 semaine / 3 réelles; entrepreneur silencieux; pression à signer; extras imprévus; finitions bâclées.

Concepts entrepreneurs : client qui surveille continuellement; recherche du prix le plus bas; trafic Montréal / territoire; changements d’idées constants; petits contrats non rentables.

Mini-clip 11 : « J’ai pas le temps de remplir de questionnaire! » — messages vocaux courts, Clara apprend au rythme de la personne, reprise plus tard, sans incitation à interagir en conduisant.

Chaque concept devra être transformé en script de production complet de 15–20 secondes : dialogue calibré, plans, texte à l’écran court et lisible, CTA FR-QC, logo officiel. Prononcer UNPRO « un pro », jamais lettre par lettre. Utiliser la voix du fondateur seulement si l’enregistrement source est autorisé et disponible; sinon signaler l’asset manquant et ne jamais l’inventer.

Checklist avant production : scripts approuvés, consentements des voix/personnes, enregistrement fondateur autorisé, logo officiel, URL, sous-titres, contraste mobile, musique licenciée, validation légale, validation sécurité routière, export, revue finale et autorisation de publication. La production/publication reste une phase distincte du funnel à 350 $.

## 9. Phases et dépendances

### P0-BUSINESS — immédiat, inchangé

Obtenir la première puis la deuxième vente réelle à 350 $. Corriger et vérifier acquisition/outreach conforme, onboarding, Stripe live, webhook, activation et observabilité. Cette initiative ne doit ajouter aucune dépendance ni étape au paiement.

### P1-LOW COST — après les premières ventes

Auditer et reconnecter extraction, événements, mémoire, questions incrémentales texte/voix, consentement, correction et suivi des vrais événements. Vérifier les données et accès existants avant toute migration. Livrer des tests de bout en bout fail-closed.

### P2

Connecter le questionnaire volontaire à la mémoire unique et le feedback bidirectionnel après un rendez-vous réel. Préserver l’UX mobile, la reprise et l’accès au funnel sans questionnaire.

### P3

Afficher l’explication des matchs, produire un rapport de qualité et tester des ajustements expérimentaux contrôlés avec feature flag et rollback.

### Parallèle marketing

Rédiger scripts et storyboards sans modifier le funnel. Produire les vidéos seulement après validation des assets, consentements et revues.

## 10. Vie privée, sécurité et conformité

- Loi 25 : finalité claire, minimisation, consentement ou base d’utilisation, rétention limitée, correction, suppression et opt-out.
- Accès : politiques par propriétaire de données, séparation propriétaire/entrepreneur/admin, tests anon/propriétaire/autre utilisateur/admin.
- Provenance : conserver déclaré/vérifié/inféré/en attente et l’incertitude.
- Données sensibles : ne pas faire d’inférence médicale, psychologique ou discriminatoire; ne pas profiler une personnalité.
- Voix : ne pas conserver l’audio brut sans consentement explicite et politique de rétention.
- Apprentissage : agrégation, seuil d’échantillon, aucune punition individuelle automatique, audit et rollback.
- Vérité : aucune rencontre, transaction, note, satisfaction, disponibilité ou résultat inventé.
- Sécurité applicative : scan propre pour le périmètre, autorisations vérifiées, logs sans secrets ni données privées inutiles.

## 11. Scénarios et critères d’acceptation futurs

1. Une phrase libre FR-QC d’un propriétaire puis d’un entrepreneur produit un événement dans la bonne entité avec valeur, provenance, portée, confiance, statut et preuve.
2. Une conversation interrompue reprend sans répéter; préférence, consentement et correction sont visibles.
3. Le questionnaire facultatif lit et écrit la même mémoire; le paiement et l’activation restent accessibles sans le remplir.
4. La recommandation respecte tous les hard blockers; chaque raison est traçable; une donnée absente reste inconnue.
5. Les feedbacks des deux côtés se rattachent à un rendez-vous réel et distinguent signal isolé, répétition et tendance.
6. Les tests mobile, clavier, voix, reprise, permissions et accès passent; aucun faux rendez-vous, avis, score ou paiement.
7. Le feature flag permet l’arrêt, et le rollback restaure le comportement précédent sans perte de données légitimes.

## 12. Résultats mesurables

Suivre uniquement des événements réels :

- taux de complétion du parcours à 350 $;
- conversations avec extraction valide;
- demandes de clarification et taux de confirmation;
- corrections et opt-out;
- rendez-vous exclusifs tenus;
- compatibilité et satisfaction des deux côtés;
- annulations;
- conversion rendez-vous → devis → contrat;
- délais et problèmes documentés;
- dérive des règles, erreurs d’extraction et rollbacks.

## 13. Conditions de lancement

Lancer une phase seulement si son périmètre est vérifié, ses accès testés, ses données réelles, ses métriques définies, son feature flag actif et son rollback éprouvé. Arrêter en cas de permissions trop larges, provenance absente, duplication de mémoire, impact sur le checkout à 350 $, ou résultat non traçable.
