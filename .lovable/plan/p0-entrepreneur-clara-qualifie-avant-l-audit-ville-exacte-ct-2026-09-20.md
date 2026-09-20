# P0 Entrepreneur — Clara qualifie avant l'audit, ville exacte, CTA réparé

## Ce qui a été vérifié dans le système réel

- Dossier « Isolation Solution Royal » : la fiche entrepreneur porte **Laval** (aucune adresse, aucun code postal, aucun territoire enregistré), la fiche officielle issue du registre porte **Terrebonne** avec le même site officiel `isroyal.ca`. L'audit affiche d'abord la ville de la fiche entrepreneur, donc « Laval », et relègue Terrebonne en « Autre ville détectée · DÉDUIT ». Le libellé utilisé est « Territoire principal », ce qui mélange siège et territoire desservi.
- Il existe déjà une table de territoires desservis avec source et statut de validation, et une notion de ville principale. Elle est **vide** pour ce dossier : rien ne justifie donc « Laval » comme siège.
- Le parcours canonique existant est : audit gratuit → profil → objectifs → services → plan personnalisé → paiement. Les anciennes adresses d'onboarding redirigent déjà vers l'audit. Le bouton « Compléter mon profil » envoie vers le profil avec l'attribution complète, mais **sans état de chargement, sans reprise à la première étape manquante et sans erreur visible si la navigation échoue**.
- Clara possède déjà une conversation canonique unique (session serveur, messages, références métier) et un mécanisme de navigation unique. Aujourd'hui, dès qu'un entrepreneur se déclare, Clara prononce une phrase de transition puis ouvre l'audit : **aucune question de qualification n'est posée**.

## 1. Clara qualifie avant d'ouvrir l'audit

Avant toute ouverture d'écran, Clara mène une courte conversation, une seule question à la fois, maximum 5, et **jamais une question dont la réponse est déjà connue** :

1. Reformulation du besoin (« obtenir de meilleurs contrats sans perdre de temps en soumissions inutiles »).
2. Métier principal.
3. Ville où l'entreprise est établie (siège).
4. Villes ou régions réellement desservies.
5. Objectif (plusieurs choix possibles).

Chaque réponse est enregistrée immédiatement dans la conversation canonique, avec la mention « déclaré par l'entrepreneur ». Ensuite seulement : « Parfait. Je regarde ce qu'UNPRO comprend déjà de votre entreprise… », pause visible, puis ouverture de l'audit. Même enchaînement en texte et en voix, sans plein écran.

**Si l'entreprise est déjà connue**, Clara confirme au lieu de demander : « J'ai trouvé Isolation Solution Royal, en isolation d'entretoit, établie à Terrebonne. C'est bien ça ? » Une correction de l'entrepreneur devient immédiatement la meilleure source.

## 2. Ville de l'entreprise ≠ territoire desservi

- La ville affichée sous le nom de l'entreprise devient la **ville d'établissement**, jamais une ville de campagne, de prospection, de demande d'audit ou de territoire.
- Ordre de confiance appliqué partout : registre/source officielle → site officiel → fiche Google → déclaré par l'entrepreneur → déduit → inconnu. Une ville moins fiable ne remplace jamais une ville plus fiable.
- Les territoires desservis proviennent uniquement des territoires réellement enregistrés ou confirmés par Clara. Aucun territoire n'est déduit d'un lead.
- Le bloc « Autre ville détectée » disparaît : soit la ville est le siège, soit c'est un territoire, soit elle n'est pas affichée.
- Conséquence sur le dossier testé : « Isolation Solution Royal / Isolation d'entretoit · Terrebonne », et « Territoires desservis » affiché seulement s'il existe vraiment.
- La donnée « Laval » du dossier n'est pas supprimée en base : elle est déclassée comme non prouvée et n'est plus présentée comme le siège.

## 3. Badges honnêtes

Vérifié, Déclaré, Déduit, En attente correspondent à la source réelle de chaque information. Aucune licence, aucun avis, aucune adresse, aucun territoire, aucun score n'est inventé. Les avis externes ne sont jamais présentés comme des avis vérifiés par UNPRO.

## 4. « Compléter mon profil » — réparation

- État de chargement immédiat au clic, bouton non cliquable deux fois.
- Reprise à la **première étape réellement incomplète** : si Clara a déjà obtenu métier, ville, territoires et objectifs, ces étapes sont préremplies et sautées.
- L'identité du dossier, la conversation, le prospect, la campagne et l'affiliation suivent intégralement.
- Si la navigation échoue : message d'erreur réel, lisible, avec une action de réessai, et l'échec est journalisé.

## 5. Clara continue sur l'audit

La même conversation se poursuit sur la page d'audit (mêmes messages, même identifiant, texte et voix), en format compact, jamais en plein écran. Clara y commente l'audit réel : ce qui est déjà clair et ce qui reste à confirmer. Les territoires confirmés dans la conversation mettent l'audit à jour immédiatement : « Territoire desservi » cesse d'être « En attente ».

## 6. Continuité vers l'onboarding

À l'arrivée dans le profil, les réponses déjà données sont préremplies avec la mention « Clara a déjà préparé ceci à partir de votre conversation. » L'entrepreneur confirme ou corrige. Aucune question n'est reposée. Les données survivent à un rafraîchissement et à un retour arrière.

## Détails techniques

- Aucune nouvelle table, aucun nouveau funnel. Réutilisation de la table de territoires existante (`contractor_service_areas` : `is_primary`, `data_source`, `validation_status`) pour les territoires, et de `contractors.city` / `address` pour le siège.
- `supabase/functions/ai-recommendation-audit` : remplacer la fusion actuelle `contractor.city ?? prospect.city ?? body.city` par une résolution par niveau de confiance (`resolveBusinessCity`) retournant `{ value, provenance, source }` ; `body.city` (ville de la requête/campagne) n'est jamais candidat au siège. Retrait du fait `city_alt`. Le fait `city` devient `business_city` / libellé « Ville de l'entreprise » ; nouveau fait `service_areas` alimenté uniquement par les territoires enregistrés/confirmés. Les écarts entre ville de fiche et ville officielle sont journalisés, pas affichés comme un second siège.
- Contexte Clara : extension de `ClaraContextPatch.workflow` avec `contractor_qualification` (`primary_trade`, `business_city`, `service_areas[]`, `goals[]`, chacun avec provenance `declared`). Persisté via `clara-session`, donc multiappareil, sans copie de donnée métier hors références.
- `ClaraConversationBox.tsx` + `claraVoiceBridge.ts` : la transition entrepreneur n'appelle `finishContractorTransition` qu'après la fin du script de qualification (`claraContractorQualification.ts`, nouvel unique module de script, une question par tour, sauts si la donnée est déjà connue). `OverlayAlexVoiceFullScreen` suit le même script, mode compact.
- `PageAiRecommendationAudit.tsx` : affichage `business_city`, section « Territoires desservis » conditionnelle, hydratation depuis la qualification Clara, montage du chat Clara compact, mise à jour de la carte « 3 étapes restantes » depuis les faits réels.
- CTA : `activate()` devient `async` avec état `activating`, résolution de la première étape incomplète à partir de `contractor_onboarding_states` et de la qualification Clara (`resolveNextProfileStep`), ancre `#` vers l'étape, `try/catch` avec message d'erreur affiché et événement journalisé.
- Observabilité (fonction de suivi existante) : `contractor_intent_detected`, `contractor_context_captured`, `business_location_confirmed`, `service_area_confirmed`, `contractor_audit_opened`, `profile_completion_clicked`, `contractor_onboarding_resumed` — avec identifiant de conversation et de dossier, sans donnée personnelle.
- Tests : scénarios A à E du brief en 390 px (nouvel entrepreneur, Isolation Solution Royal, CTA dans les 4 états d'authentification, continuité texte→audit→voix, rafraîchissement), plus `npm test`, types, lint critique et compilation.

## Limite connue

La route `/entrepreneur/onboarding` redirige déjà vers l'audit gratuit : la première étape réelle du profil est `/entrepreneurs/profil`. C'est cette destination canonique qui est utilisée, sans en créer une seconde.
