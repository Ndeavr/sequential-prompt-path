# ONE CLARA — continuité canonique avant unification

## 1. Contexte vérifié

UNPRO possède déjà les briques nécessaires, mais elles ne suivent pas encore toutes le même identifiant de continuité :

- `alex_conversation_sessions` porte déjà `anonymous_id`, `user_id`, rôle, intention, mémoire, adresse active, entrepreneur sélectionné et étape courante.
- Le moteur historique `alex-process-turn` écrit encore dans `alex_sessions` + `alex_messages` à partir d’un `session_token`.
- La boîte Clara de l’accueil conserve actuellement son propre tableau de messages et appelle `alex-chat` sans identifiant de conversation.
- Le retour d’authentification conserve correctement le rôle et la destination, y compris par jeton serveur pour OTP/lien ouvert sur un autre appareil, mais ne transporte pas encore le contexte Clara complet.
- Les analyses de soumissions et vérifications d’entrepreneur possèdent déjà leurs mécanismes de rattachement authentifié; ils reposent toutefois encore sur des identifiants conservés localement ou dans l’URL.
- La création canonique de projet est atomique et idempotente, puis appelle le moteur canonique de jumelage avec `lead_id`.
- Le Passeport Maison est autoritaire par `property_id`.
- Le plan entrepreneur personnalisé est autoritaire par `contractor_pricing_quotes.id`; Stripe doit recevoir ce `quote_id` et le `contractor_id` résolu côté serveur.
- Les tables concernées ont RLS activé. Les tables de conversation n’ont pas de clés étrangères déclarées entre elles : les raccords sont applicatifs.

## 2. Objectif

Construire une seule continuité :

```text
anonymous_id
    │
    ▼
conversation_id ── auth ──► user_id + rôle canonique
    │
    ├── homeowner ─► property_id ─► project_id ─► lead_id
    │                                  │
    │                                  └──► match_id ─► appointment_id
    │
    ├── quote_analysis_id
    ├── verification_run_id
    ├── visual_analysis_id
    │
    └── contractor ─► contractor_id ─► pricing_quote_id ─► checkout_session_id
```

Réutiliser les enregistrements existants. Ne créer ni seconde conversation, ni nouvelle route, ni nouveau moteur de jumelage, de réservation, de prix ou de paiement.

## 3. Cartographie des transitions à produire

Créer une matrice vérifiable pour chaque transition demandée :

1. anonyme → login / OTP;
2. anonyme → compte propriétaire;
3. anonyme → compte entrepreneur;
4. conversation → création de projet;
5. conversation → Passeport Maison;
6. conversation → vérification d’entrepreneur;
7. conversation → analyse de soumissions;
8. conversation → onboarding entrepreneur;
9. onboarding → plan personnalisé → Stripe;
10. conversation → jumelage → rendez-vous;
11. rafraîchissement / retour navigateur / réouverture;
12. mobile ↔ ordinateur avec le même compte authentifié.

Pour chaque ligne, documenter : source de vérité, identifiant de conversation/session, `user_id`, `contractor_id`, `property_id`, `project_id`, `lead_id`, identifiant métier associé, perte actuelle, doublon et raccord retenu.

## 4. Les 9 issues à traiter

### P0 — perte de conversation, identité, paiement ou données

1. **Deux familles de sessions Clara actives.** Le runtime historique utilise `alex_sessions`/`alex_messages`, tandis que des fonctions récentes utilisent `alex_conversation_sessions`. Déterminer l’autorité réellement viable, puis adapter les appels existants vers elle sans créer une troisième famille.
2. **La boîte d’accueil n’envoie aucun `conversation_id`.** Son historique local et ses pièces jointes peuvent diverger de la session Clara réelle. Brancher la boîte sur le store/runtime retenu et retirer uniquement cet état conversationnel parallèle.
3. **La restauration navigateur ne restaure pas réellement l’identifiant ni les messages sauvegardés.** Le snapshot contient ces valeurs, mais la restauration actuelle ne les réinjecte pas; son contrôle d’identité compare en plus un UUID de session à un fragment de `user_id`. Remplacer ce contrôle par une validation serveur de propriété de session.
4. **Le retour OTP/OAuth transporte le rôle et la destination, pas le manifeste de continuité.** Étendre le mécanisme canonique existant pour rattacher, de façon opaque et idempotente, la conversation et les artefacts admissibles au compte authentifié. Ne jamais placer de donnée privée dans l’URL.
5. **Le paiement entrepreneur accepte plusieurs formes de contexte et une page historique recalcule encore l’annuel côté client.** Forcer `contractor_id + pricing_quote_id + plan_code + billing_interval` depuis les sources serveur, conserver le même `quote_id` jusqu’au succès/annulation et supprimer le calcul client historique du prix annuel.

### P1 — parcours cassé ou continuité incomplète

6. **Conversation → projet n’inscrit pas le raccord conversationnel.** Conserver la création atomique existante et inscrire le `project_id`/`lead_id` retourné dans la mémoire de la conversation existante, sans modifier l’autorité du projet.
7. **Analyse de soumissions et vérification d’entrepreneur ont deux reprises spécialisées mais aucun manifeste commun.** Réutiliser `claim-quote-analysis` et `verify-attach-anonymous`; enregistrer leurs IDs dans le contexte Clara avant auth, puis les réclamer idempotemment après auth. Une propriété appartenant à un autre compte reste refusée.
8. **Passeport Maison et analyses visuelles ne reviennent pas automatiquement à la même propriété active.** Résoudre `property_id` après authentification, le conserver dans la session Clara et rattacher seulement les observations/documents autorisés à cette propriété.
9. **Jumelage → rendez-vous doit préserver explicitement le couple `project_id`/`lead_id`.** Garder `project_matches` et les créneaux serveur comme autorités; transmettre le contexte jusqu’à la confirmation et refuser tout créneau non revalidé ou toute recommandation devenue inadmissible.

### P2 — UX et duplication à nettoyer pendant l’unification

- Plusieurs clés locales (`alex_session`, intentions, journey snapshot, IDs d’analyse/vérification) expriment des fragments du même parcours.
- La boîte d’accueil, le panneau Clara et certains retours de parcours affichent des états conversationnels distincts.

Les P2 seront consolidés seulement après correction et tests des P0/P1.

## 5. Raccord canonique recommandé

### Autorités métier

- **Identité :** session d’authentification + `user_roles`; jamais le stockage navigateur.
- **Conversation :** une table de session Clara existante, sélectionnée après test de viabilité entre les deux familles actuelles; l’autre devient un adaptateur de compatibilité, pas une seconde autorité.
- **Messages :** la collection déjà liée à la session retenue.
- **Propriétaire :** `user_id` → `properties.id` → `projects.id` → `project_requests.id`.
- **Entrepreneur :** `user_id`/profil autorisé → `contractors.id` → `contractor_pricing_quotes.id`.
- **Jumelage :** `lead_id`/`project_id` → `project_matches.id`, avec admissibilité serveur.
- **Rendez-vous :** créneau serveur revalidé → `appointments.id` ou demande canonique existante.
- **Paiement :** `checkout_sessions` + événement Stripe signé et idempotent.

### Contexte de liaison

Utiliser les champs JSON/métadonnées déjà présents dans la session retenue pour stocker seulement les références nécessaires :

```text
conversation_id
anonymous_id
user_id
role
active_property_id
active_project_id
active_lead_id
selected_match_id
selected_contractor_id
quote_analysis_ids[]
verification_run_ids[]
visual_analysis_ids[]
contractor_id
pricing_quote_id
checkout_session_id
current_intent
current_step
```

Ne pas dupliquer les données métier dans la conversation. La conversation conserve des références; chaque domaine demeure sa source de vérité.

## 6. Ordre d’implémentation

1. Écrire les tests de contrat de continuité et figer la matrice des IDs.
2. Choisir l’autorité conversationnelle existante avec un test de lecture/écriture/reprise; ajouter un adaptateur ciblé pour les appels historiques.
3. Corriger les P0 sûrs : boîte d’accueil, restauration, promotion après auth, contexte paiement.
4. Corriger les P1 sûrs : projet, analyses, vérification, Passeport, jumelage et rendez-vous.
5. Arrêter avant toute migration destructive, fusion de données historiques ambiguë ou modification distante risquée; présenter alors l’impact, le retour arrière et demander une approbation explicite.
6. Unifier ensuite l’accueil dans une seule boîte Clara extensible utilisant la conversation retenue et les outils existants.
7. Supprimer uniquement les états UI devenus redondants après preuve de reprise complète.

## 7. UI/UX après raccordement

- Garder l’accueil initial minimal et la boîte Clara unique.
- Faire apparaître dans cette même boîte les outils existants : photo, documents, vérification, soumissions, projet, Passeport, onboarding, plan, jumelage et rendez-vous.
- Poser une seule question à la fois et relire les données connues avant de demander.
- Afficher uniquement `VÉRIFIÉ`, `DÉCLARÉ`, `OBSERVÉ`, `INFÉRÉ` ou `À CONFIRMER` selon la provenance réelle.
- Conserver les erreurs récupérables, les refus explicites, le focus clavier, la réduction des animations et les comportements mobile.

## 8. Validation

### Tests de continuité

- Même appareil : anonyme → OTP/OAuth → retour exact avec conversation et outil ouvert.
- Rôles : propriétaire et entrepreneur sans création automatique du mauvais rôle.
- Artefacts : photos multiples, trois devis, vérification et observation Passeport conservés puis réclamés une fois.
- Projet : création idempotente, même `project_id`/`lead_id` après rejeu.
- Entrepreneur : onboarding → même `contractor_id` → même `pricing_quote_id` → checkout non vide.
- Paiement : succès, annulation et rejeu webhook gardent les mêmes IDs; aucune charge réelle pendant les tests.
- Jumelage : résultat réel ou refus explicite; aucun entrepreneur inventé.
- Rendez-vous : créneau réel revalidé et lié au bon projet, ou demande d’horaires honnête.
- Navigation : refresh, précédent/suivant, fermeture/réouverture.
- Multiappareil : même compte recharge le contexte serveur; les fichiers locaux non téléversés restent explicitement signalés comme non transférables.
- Sécurité : RLS, appartenance des artefacts, rôle, RBQ/compliance, provenance et absence de fuite dans les URLs.

### Contrôles finaux

- Tests ciblés de contrat, suite pertinente, typage, lint critique et build.
- Parcours Playwright à 390 px et 1280 px.
- Contrôle runtime, console et réseau.
- Rapport final avec les 12 transitions, les 9 issues, les corrections réellement effectuées, les preuves et tout blocage externe.

## 9. Contraintes

- Ne créer aucune nouvelle couche de conversation.
- Ne supprimer aucune donnée historique automatiquement.
- Ne modifier ni secrets, ni prix live, ni configuration Stripe live.
- Ne déclencher aucun SMS, courriel, appel ou notification automatique.
- Ne contourner ni RLS, ni auth, ni RBQ/compliance, ni admissibilité serveur.
- Ne publier aucune modification sans demande explicite.
- Demander une approbation avant toute migration destructive ou écriture distante risquée.

## 10. Critère de succès

Un même parcours conserve une seule identité conversationnelle et les références métier exactes depuis l’anonymat jusqu’au compte, au projet ou à l’entreprise, au jumelage, au rendez-vous ou au paiement, puis se restaure après authentification, navigation et changement d’appareil. L’interface Clara unique n’est construite qu’après preuve que ces raccords sont stables.
