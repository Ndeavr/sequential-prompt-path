# Cinq alertes P0 — réparation locale, 18 octobre 2026

## Portée et sécurité

Projet existant uniquement. Dernier HEAD connu utilisateur : `b443ccf94a23d47b8db2a24d8c9c9f23be7e5335`.
HEAD de départ revérifié : `f081125251545c8080f8388d4e9a918d6c5f6f81`, descendant de la source Lovable active; `npm run verify:source` réussi. Le système versionne automatiquement les éditions; HEAD lu lors de la validation : `dc48c8710a72d48e11040a9cb9c522dfa77b8448` (avant rédaction de ce rapport). Aucun commit Git manuel ni manipulation de branche.

PUBLISHED: NO. EDGE_DEPLOYED: NO. LIVE_CHARGES: NO. SQL_APPLIED: NO. OUTBOUND: NO.
Remix QA non consulté/modifié. Aucune écriture distante, création de service ou activation de secret. Les fichiers Stripe/RBQ de validation des droits et les devis anonymes ne sont pas modifiés. Les écarts préexistants de sitemap/corpus n'ont pas été édités manuellement.

## 1 — Adresses publiques

- Les formulaires urgence `/emergency` et score `/score-maison` utilisent déjà le hook invité. `/decrire-mon-projet` n'avait aucun champ Google dans son formulaire manuel : champ raccordé au même composant, sans nouveau moteur.
- Le hook confirme une session Clara invitée existante côté serveur; le quota atomique existant `reserve_address_lookup` est conservé, aucune infrastructure de limitation ajoutée.
- Origines applicatives explicites, méthodes POST/OPTIONS, propriétaire d'une session rattachée vérifié, identifiant place borné, masque Details réduit aux champs adresse/coordonnées; aucune clé serveur dans le navigateur. La session invitée n'est pas un compte Auth.
- Sélection confirmée uniquement après Details; `placeId` et provenance `google_places` transmis. Échec Details conserve la saisie avec mention manuelle « à confirmer »; réponse tardive après nouvelle saisie ignorée.
- Connexion Google liée et accessible inspectée; aucun journal récent disponible pour `google-places-autocomplete`. Impossible de confirmer quota, restrictions ou panne fournisseur réelle depuis les journaux.
- Tests : propriété/origines 3 tests; hook invité 4 tests; trois formulaires × quatre largeurs avec réponses simulées. Aucune sélection Google LIVE ni réparation de permission fournisseur démontrée. Les règles de sandbox interdisent les sondes Google réelles; validation ultérieure sur origine autorisée nécessaire.
- Le callback de soumission de `/decrire-mon-projet` reste le callback existant (console), non refait : cette passe vérifie uniquement la saisie/sélection demandée, pas une création de projet.

## 2 et 4 — Continuité et changement d'audience

- Cause exacte : `hasExplicitHomeownerFlow()` réduisait `messages` au seul dernier texte. Remplacé par historique partagé, filtré par audience, 20 tours maximum et résumé extractif borné des tours plus anciens.
- `alex-chat` lit désormais les messages canoniques `alex_sessions`/`alex_messages` du jeton, vérifie le propriétaire par JWT, puis ajoute le dernier tour local si son append est encore en cours. L'identifiant utilisateur fourni par le client ne détermine plus les recherches privées.
- Tour texte/voix persistant avec audience dans `message_type`, brief vocal filtré par audience; métadonnées maison omises du brief entrepreneur.
- Transition explicite suspend le parcours PRO et ses réponses, conserve le jeton et le fil; protection contre hydratation et réponses/animations retardées d'une ancienne audience.
- En conversation mobile active, le cadre plein écran recouvrait le CTA situé plus bas dans la page. Ajout d'un bouton maison accessible dans les commandes Clara, intitulé « Trouver mon entrepreneur », utilisant le même événement existant; aucune modification z-index.
- Tests navigateur simulés : fuite → question → « environ deux semaines »; passage entrepreneur → retour maison tactile → actualisation → réponse maison avec contexte de fuite, sans tour entrepreneur dans la requête. Même jeton vérifié. 360/390/430/1280 px.
- Aucun vrai appel Clara/voix, auth distante ou déploiement. Conservation de la conversation vérifiée avec serveur simulé; réponse sémantique produite par fixture, pas par un fournisseur réel.

## 5 — RBQ

- Normalisation accents/apostrophes/tirets, métiers en tokens entiers, lexique FR/EN. `gazon`/`lawn care` ne correspondent pas à `gaz`/`gas`.
- Scopes uniquement entretien : exemption inférée, jamais licence vérifiée. Chauffage/raccordement gaz et travaux mixtes réglementés restent requis. Activité inconnue ajoutée à l'entretien : clarification.
- 32 tests d'applicabilité + tests dashboard/transition existants. Aucun changement de permis, fiche publique, admissibilité backend ni droits acquis.

## 3 — Modèles : remplacement partiel et preuves

GET authentifié `/v1/models` uniquement; aucune génération. Catalogue workspace confirmé (`workspace_models: included`). Contrairement aux anciennes informations de documentation, le catalogue marque `google/gemini-2.5-flash`, `2.5-flash-lite` et `2.5-flash-image` comme dépréciés.

Quatre sites actifs inspectés : résumé entrepreneur utilisé par `alex-chat`, `alex-qualify-turn`, `diagnostic-analyze`, `visual-analysis`. Modèle partagé remplacé par `google/gemini-3.1-flash-lite`, non déprécié, mêmes entrées texte/image/audio/vidéo et sortie texte. Endpoint Chat Completions/format JSON et plafonds préexistants conservés. Tarifs catalogue texte par million : entrée 0,25 $ / sortie 1,50 $, contre 0,30 $ / 2,50 $ pour 2.5 Flash; audio 0,50 $ contre 1 $. Aucun appel réel vérifié.

Deux tests de protocole simulé : identifiant/format JSON et absence de faux résumé/retry lors d'une panne.

Non remplacés : image `design-generate` (2.5 Flash Image et identification 2.5 Flash), anciennes voix realtime du registre et autres fonctions hors audit actif. 65 lignes `model.*2.5` restent dans le dépôt à l'inventaire final. Leur statut déployé/usage réel n'est pas établi par ce grep. L'équivalent image 3.1 Flash Lite Image nécessite un protocole différent; Gemini 3 Pro Image augmente le coût image catalogue. Aucun simple renommage ni migration image non vérifiée. Aucun GPT Live contourné dans ce projet Classic. **L'alerte modèles n'est pas entièrement close.**

## Vérifications exécutées

- Première itération : 55/56 tests, échec sur ancien jeton de parcours conservé; corrigé en supprimant les marqueurs de sessions étrangères tout en conservant un parcours suspendu de même session.
- Suite finale avant rapport : **90/90 tests, 12 fichiers**, Vitest. Stripe TEST simulé/PGlite uniquement, dont gate LIVE fermé par défaut; aucun vrai checkout.
- ESLint ciblé : zéro erreur, deux avertissements préexistants Fast Refresh (fonctions exportées avec composant). Les avertissements de dépendances ajoutées corrigés.
- `git diff b443ccf94 --check` sans erreur.
- Journal automatique `/tmp/observability/build-errors.log` : dernier signal `build OK` à 18:59:46 UTC au contrôle final; aucun build/typecheck manuel exécuté (harness gère la compilation). Pas de preuve de typage Deno complet.
- Playwright : quatre tailles, trois formulaires simulés chacun et continuité/changement/rechargement Clara; zéro `pageerror`. Avertissements React de refs déjà présents observés. API externes toutes interceptées, aucun envoi fournisseur.
- Friction sandbox : websocket Vite local se reconnecte sans port et recharge en boucle; socket interceptée uniquement dans le script de QA. Auth Debug HUD couvre le bouton submit mobile; échanges testés avec Entrée. Ce panneau est visible dans les captures, pas supprimé de l'app.
- Captures sous `/tmp/browser/p0-five/`: `*-two-turn.png`, `*-resume-home.png`, `*-emergency-address.png`, `*-decrire-mon-projet-address.png`, `*-score-maison-address.png`. Inspectées : reprise maison 390 et adresse formulaire 430. Scripts temporaires non livrés comme logique produit.

## Fichiers concernés

Frontend : `ClaraConversationBox.tsx`, `GooglePlacesInput.tsx`, `FormProjectFallbackAdaptive.tsx`, `rbqStatus.ts`, `claraContractorResume.ts`, `claraSession.ts`, `claraVoiceBridge.ts`, nouveau re-export `claraConversationHistory.ts`.

Fonctions : `alex-chat`, `clara-session`, `google-places-autocomplete`, `alex-qualify-turn`, `diagnostic-analyze`, `visual-analysis`; helpers `claraConversationHistory.ts`, `addressRequestPolicy.ts`, `claraModelSelection.ts`, `claraQualificationSummary.ts`.

Tests : `p0-five-alerts-history.test.ts`, `p0-address-security.test.ts`, `p0-clara-model.test.ts`, `rbq-applicability.test.ts`, `four-issues-address.test.tsx`, `four-issues-role-resume.test.ts`. Gouvernance : `AGENTS.md`, backlog restauré/préservé `roadmap.md`, présent audit.

## Blocages restants

Google réel, génération IA réelle, audio/image et inventaire des fonctions réellement déployées non vérifiés. Corrections backend exclusivement dans le code : aucune amélioration de production affirmée avant déploiement autorisé et validation isolée. Pas de publication proposée. Les cinq alertes proviennent de la liste fournie par l'utilisateur; le panneau Lovable lui-même n'a pas été inspecté.