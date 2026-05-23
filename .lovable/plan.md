A — PROMPT LOVABLE FINAL

1. CONTEXTE
Alex Voice reçoit bien le token et le signed URL, puis échoue avant le premier audio. Les logs montrent un timeout dans `useLiveVoice` après `conversation.startSession`, pendant que l’overlay bascule vers un fallback qui marque le greeting comme déjà livré et affiche seulement “Je continue ici avec vous.”

2. OBJECTIVE
Réparer le démarrage vocal réel sans refaire toute l’architecture maintenant : Alex doit ouvrir, parler avec Sophia, puis rester en écoute au lieu de tomber dans un état erreur/fallback.

3. USERS
Utilisateur mobile UNPRO qui ouvre Alex Voice depuis l’accueil.

4. DELIVERABLES
- Corriger `useLiveVoice` pour éviter le blocage WebSocket/WebRTC.
- Corriger `OverlayAlexVoiceFullScreen` pour ne plus traiter un greeting preview comme un greeting vocal livré.
- Corriger le fallback pour ne jamais afficher un bandeau rouge “Je continue ici avec vous.” quand le micro peut encore écouter.
- Garder Sophia `YxrwjAKoUKULGd0g8K9Y` comme seule voix.

5. LOGIC
- Passer le démarrage principal en WebRTC avec `conversationToken`, car le token est déjà retourné par `voice-get-signed-url`.
- Garder WebSocket `signedUrl` seulement comme fallback court si WebRTC échoue immédiatement.
- Réduire le timeout de connexion réel à 3000 ms pour respecter la règle hard cap.
- À timeout avant premier audio : arrêter la session SDK, libérer le lock, forcer l’état `listening`, puis jouer une seule fois le greeting Sophia via TTS direct si aucun vrai audio n’a été reçu.
- Ne jamais appeler `markGreeted()` avant un vrai début audio ou une fin TTS réussie.
- Ne jamais appeler `s.setError(..., "Je continue ici avec vous.", true)` pour un timeout de boot pré-audio.

6. DATA
Aucune migration. Aucune table modifiée.

7. UI/UX
- Supprimer le dead-end rouge pour les erreurs pré-audio récupérables.
- Afficher “Connexion d’Alex…” maximum 3 secondes.
- Après 3 secondes, afficher un état calme d’écoute ou le chat fallback si le micro est impossible.
- Conserver les boutons Réinitialiser Alex / Passer au chat seulement si nécessaire.

8. COMPONENTS
- `OverlayAlexVoiceFullScreen.tsx`
- `useLiveVoice.ts`
- `voiceRuntimeSingleton.ts` si nécessaire pour ajouter un reset forcé sûr.

9. ACTIONS
- Refactorer l’ordre de connexion : `conversationToken` WebRTC d’abord, `signedUrl` WebSocket fallback.
- Ajouter un `AbortController` logique de session : chaque callback vérifie que le boot courant possède encore le runtime.
- Corriger le TTS fallback : il doit parler si aucun audio réel n’a joué, même si une bulle preview existe.
- Corriger le cleanup : arrêter mic, SDK session, timers, TTS, runtime lock.
- Corriger le retry : ne pas utiliser un flow de recovery qui peut retomber dans `failed_fallback_chat` immédiatement.

10. CONSTRAINTS
- Ne pas utiliser `window.speechSynthesis`.
- Ne pas ajouter de mode appel Bluetooth.
- Ne pas modifier `src/integrations/supabase/client.ts` ou `types.ts`.
- Ne pas ajouter de provider vocal masculin.
- Ne pas autostart sans action utilisateur.

11. SUCCESS
- Ouverture Alex Voice depuis `/index`.
- Token reçu.
- Session démarre sans rester bloquée.
- Sophia dit “Bonjour Yanick. Je vous écoute.” si prénom disponible.
- L’interface passe à “Alex écoute…”.
- Aucun “Alex redémarre…”.
- Aucun bandeau rouge “Je continue ici avec vous.” sur boot normal.
- Le bouton Réinitialiser relance proprement une seule session.

12. TASKS
- Modifier `useLiveVoice.ts` pour privilégier WebRTC token, timeout 3s, cleanup agressif, fallback WebSocket court.
- Modifier `OverlayAlexVoiceFullScreen.tsx` pour dissocier preview greeting et greeting vocal livré, supprimer l’erreur rouge pré-audio, forcer listening après fail-safe.
- Modifier le retry pour redémarrer via le même boot clean sans recovery parallèle.
- Valider par logs console ciblés : token reçu, connection start, onConnect, first audio ou fallback TTS, listening.