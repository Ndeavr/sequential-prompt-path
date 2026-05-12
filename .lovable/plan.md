A — PROMPT LOVABLE FINAL

1. CONTEXT
UNPRO doit présenter Alex comme une expérience voice-first fiable. Les captures montrent trois problèmes immédiats : Alex tombe en mode chat, le CTA “Je suis un entrepreneur” est trop haut, et les pills ouvrent seulement le chat texte au lieu d’ouvrir une expérience voix + texte.

2. OBJECTIVE
Implémenter un correctif ciblé qui :
- Stabilise le démarrage vocal Alex sans fallback prématuré.
- Augmente l’enthousiasme/persona d’Alex de 15% dans le contexte envoyé au moteur vocal.
- Descend visuellement “Je suis un entrepreneur” sur mobile.
- Fait ouvrir Alex Voice + transcript texte lorsqu’un utilisateur presse une pill comme “Problème urgent”.

3. USERS
- Propriétaire mobile sur unpro.ca
- Entrepreneur qui arrive depuis la homepage
- Utilisateur urgent qui clique une pill et veut parler immédiatement

4. DELIVERABLES
- Patch `HeroSectionAlexFirst` pour déplacer le CTA entrepreneur plus bas et déclencher Alex voix + texte depuis les pills.
- Patch `useLiveVoice` pour rendre le boot plus robuste : token avec payload, timeout plus réaliste, WebRTC token prioritaire si disponible, WebSocket fallback conservé.
- Patch `voice-get-signed-url` pour retourner aussi un `conversationToken` utilisable en WebRTC, tout en conservant `signedUrl`.
- Patch `OverlayAlexVoiceFullScreen` pour éviter le fallback chat trop agressif avant le premier audio et transmettre le contexte de la pill dans le greeting.

5. LOGIC
- Au clic d’une pill non-photo :
  - Stocker le preset dans le transcript texte.
  - Ouvrir le locked voice overlay.
  - Passer le preset comme `contextHint` pour que le premier échange d’Alex parte directement sur le sujet.
  - Garder le transcript texte visible dans l’overlay voix.
- Pour “Téléverser une photo”, conserver le comportement photo.
- Pour “Je suis un entrepreneur”, conserver la navigation entrepreneur, mais descendre le bouton après les pills sur mobile.

6. DATA
- Aucun changement de table requis.
- Aucun secret exposé.
- Edge function existante `voice-get-signed-url` mise à jour pour retourner deux credentials : `conversationToken` + `signedUrl`.
- Logs existants `voice_runtime_logs` conservés.

7. UI/UX
- Mobile-first.
- CTA entrepreneur repositionné sous les pills avec marge plus naturelle.
- Pills deviennent de vrais déclencheurs conversationnels : action immédiate, pas de sheet texte isolée.
- Overlay voix conserve transcript texte pour confirmer ce que l’utilisateur a sélectionné.
- Fallback chat reste disponible, mais ne s’active plus trop tôt pendant le cold start.

8. COMPONENTS
- `HeroSectionAlexFirst`
  - Créer `openAlexFromIntent(chip)`.
  - Pour les pills, appeler `openVoice("homepage_intent_<id>", chip.preset)` et ouvrir la surface texte/transcript.
  - Déplacer le bloc entrepreneur après le groupe de pills sur mobile avec espacement contrôlé.
- `OverlayAlexVoiceFullScreen`
  - Injecter `contextHint` comme premier transcript utilisateur local si présent.
  - Construire un greeting plus énergique : confiance + urgence douce + une seule question.
  - Détendre le watchdog premier audio.
- `useLiveVoice`
  - Appeler `voice-get-signed-url` avec `{ environment: "prod" }`.
  - Utiliser `conversationToken` + `connectionType: "webrtc"` si disponible.
  - Basculer automatiquement sur `signedUrl` + `websocket` si WebRTC échoue.
  - Augmenter timeout premier boot pour éviter fallback prématuré sur mobile.
- `voice-get-signed-url`
  - Ajouter appel ElevenLabs conversation token.
  - Retourner `conversationToken` sans casser `signedUrl`.

9. ACTIONS
- Refactor `onChipClick` pour ouvrir Alex voice overlay.
- Preserve `upload_photo` modal.
- Preserve contractor navigation.
- Optimize voice credential acquisition.
- Improve enthusiasm by updating session context lines:
  - “Énergie: concierge premium + assurance + 15% plus vivante.”
  - “Ton: chaleureux, décidé, légèrement plus enthousiaste, jamais théâtral.”
- Validate with console/network signals after implementation.

10. CONSTRAINTS
- Ne pas réintroduire les overrides ElevenLabs côté client.
- Ne pas modifier `src/integrations/supabase/client.ts` ni `types.ts`.
- Ne pas exposer `ELEVENLABS_API_KEY` côté client.
- Ne pas transformer UNPRO en “3 soumissions”.
- Garder Alex en français par défaut.
- Garder fallback chat disponible, mais seulement après vrais échecs.

11. SUCCESS
Terminé quand :
- Cliquer “Problème urgent” ouvre Alex Voice avec transcript texte visible.
- Alex reçoit le contexte “J’ai un problème urgent à la maison.”.
- Le CTA “Je suis un entrepreneur” apparaît plus bas et ne compresse plus les pills.
- La voix tente WebRTC puis WebSocket avant fallback.
- Le fallback chat n’apparaît plus immédiatement sur cold start normal.

12. TASKS
- Implement voice credential resilience.
- Implement pill-to-voice+text behavior.
- Move entrepreneur CTA down.
- Tune Alex enthusiasm by 15% in voice session context.
- Verify by checking relevant files and runtime signals.