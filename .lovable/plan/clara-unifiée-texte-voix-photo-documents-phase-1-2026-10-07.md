# Clara unifiée — texte, voix, photo, documents (Phase 1)

## Constat (inspecté)
- Une seule Clara existe déjà sur l'accueil : la boîte de conversation de l'accueil, la session canonique `clara-session` (alex_sessions + alex_messages), le pont voix → chat et le menu `+` avec file de médias.
- Les fonctions d'analyse existent déjà : `visual-analysis` (photos), `analyze-quote-comparative` (soumissions), `alex-visual-styles` (design).
- L'intention courante est déjà stockée (`current_intent`), mais pas en segments séparés : c'est la source des contaminations propriétaire ↔ entrepreneur.
- La voix s'ouvre encore en plein écran sur mobile (le mode « floating » est réservé au bureau).

Aucune nouvelle Clara, conversation, route, table ni moteur vocal ne sera créé.

## Phase 1 — livrée dans ce tour

1. **Accueil Clara d'abord**
   - Titre « Discutons de votre projet. » et sous-titre « Qu'est-ce que vous voulez rénover, réparer ou améliorer? ».
   - Un seul composer : `+` · caméra · micro · texte · envoyer, cibles tactiles ≥ 44 px.
   - Menu `+` : Photo, Vidéo, Document, Prendre une photo, Importer une soumission, Importer un plan (réutilise la file médias existante).
   - 5 suggestions initiales; masquées dès le premier message.

2. **Voix en superposition sur le même chat**
   - Le micro ouvre une couche voix au-dessus du chat flouté/assombri (identité UNPRO, aucun avatar tiers), sur mobile comme bureau.
   - Même `conversation_id`; la dernière question de Clara et l'intention courante sont transmises au démarrage vocal; aucun message d'accueil si la conversation a déjà commencé.
   - États visibles : écoute, transcription, réflexion, parole, pause, erreur/réessayer. Transcription live.
   - Silence → état pause « Touchez pour continuer », jamais de « Êtes-vous toujours là? ».
   - Fermer = retour au chat à la même position; transcriptions déjà ajoutées au fil, sans doublon.

3. **Segments d'intention sans contamination**
   - « Je suis entrepreneur » ouvre un segment entrepreneur dans le même historique : « Bien sûr. Regardons votre entreprise. Quel est son nom? ».
   - Le contexte envoyé au moteur ne contient que le segment actif; l'ancien projet maison reste visible et récupérable via « Revenir à mon projet maison ».
   - Le segment entrepreneur mène au golden path validé (entreprise → objectifs/capacité → entente 100/200/350/500 → Stripe → activation) sans modifier tarif ni logique.

4. **Photo, design, soumissions dans le fil**
   - Photo problème → `visual-analysis`, réponse prudente (« ressemble à… ») + une seule question.
   - Photo design → directions de style existantes, puis « Voulez-vous explorer le design ou trouver quelqu'un pour le réaliser? », en réutilisant les infos déjà recueillies.
   - Plusieurs soumissions → `analyze-quote-comparative`, comparaison dans le fil.
   - États upload : envoi, analyse, terminé, échec/réessayer; le message utilisateur n'est jamais perdu.

5. **Composer mobile et persistance**
   - Composer collé au-dessus du clavier (safe-area, visualViewport), sans saut ni espace vide.
   - Rechargement : historique, segment actif, médias et prochaine question restaurés; jamais de retour au greeting si un dossier existe.

6. **Mesures (journal existant)**
   - Ajout des événements demandés; `voice_turn_completed` seulement après une réponse réelle, silence ≠ abandon, paiement/activation lus depuis le webhook uniquement.

## Phase 2 (prochain tour, non incluse)
- Résumé « Voici ce que j'ai compris… » suivi du jumelage propriétaire.
- Génération de concept visuel design dans le fil.
- Collecte entrepreneur entièrement conversationnelle (préremplissage Google Business dans le chat).

## Validation
- Tests automatisés : continuité voix (même session, pas de greeting, dédup), segments (F), restauration (H), médias.
- Navigateur à 360/390/412/430 px : scénarios A, B, C, D, F, G, H; E rejoué avec le compte QA en Stripe TEST si la session est disponible, sinon signalé comme non vérifié.
- Types, lint critique, build; publication seulement après PASS; rapport SHA + statut publication + résultat A–H.
- Limite externe : clavier Android/iPhone physique non testable ici.

## Détails techniques
- Fichiers principaux : `ClaraConversationBox.tsx`, `HeroHomeownerLight.tsx`, `OverlayAlexVoiceFullScreen.tsx` (mode superposé), `AlexVoiceContext.tsx` (mode d'affichage passé explicitement, fichier protégé : voice_smoke_test requis).
- Segments : stockés dans le `context` existant de la session (`segments[]`, `active_segment`), sans migration.
- Hors périmètre : prix, Stripe live, prospection, DNS, Resend, Twilio, poids de jumelage, RLS, agents.
