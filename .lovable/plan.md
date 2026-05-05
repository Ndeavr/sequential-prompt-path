Je vais rendre Alex Voice “bullet proof” en corrigeant le point faible actuel : le backend retourne bien une URL vocale, mais la session WebSocket/SDK reste bloquée sans premier audio puis tombe en erreur. Le résultat attendu sera : Alex tente la voix proprement, ne reste jamais bloqué sur un écran rouge, et bascule automatiquement vers le chat utilisable si la voix ne démarre pas.

Plan d’intervention

1. Remplacer la stratégie de connexion vocale par une stratégie plus fiable
- Modifier `useLiveVoice` pour demander d’abord un token WebRTC via la fonction backend existante `alex-conversation-token`.
- Démarrer ElevenLabs avec `conversationToken` + `connectionType: "webrtc"`, recommandé par le SDK pour la fiabilité mobile.
- Garder `voice-get-signed-url` en fallback WebSocket si le token WebRTC n’est pas disponible.
- Passer explicitement `connectionType: "websocket"` quand une signed URL est utilisée, pour éviter un démarrage ambigu du SDK.

2. Ajouter des timeouts réellement “failsafe”
- Encapsuler `conversation.startSession()` dans un timeout contrôlé.
- Si la connexion ou le premier audio dépasse le délai, arrêter la session en cours, nettoyer les ressources et basculer vers une autre tentative ou le chat.
- Empêcher les promesses bloquées du SDK de laisser l’overlay dans un état “Alex démarre…” indéfini.

3. Corriger les retries automatiques
- Corriger le bloc actuel où un échec de boot arme seulement le timer audio sans relancer vraiment `start()`.
- Chaque retry devra : arrêter la session, libérer le verrou runtime, recréer un démarrage propre, puis relancer Alex.
- Après le nombre maximal de tentatives, ouvrir directement `Alex — Mode chat`.

4. Rendre le bouton “Réinitialiser Alex” réellement nucléaire
- Ajuster le recovery pour relancer avec `force: true`.
- Libérer le verrou runtime avant le redémarrage.
- Nettoyer les timers, l’état `isConnecting`, `isActive`, les erreurs et les refs avant toute nouvelle tentative.
- Si la reconnexion ne produit aucun audio rapidement, basculer automatiquement au chat sans demander une autre action.

5. Rendre les logs non bloquants et corriger les erreurs backend visibles
- Corriger l’insert `voice_session_logs` : il échoue actuellement en 403 parce que `user_id` n’est pas fourni pour un utilisateur authentifié. Je vais inclure `user_id: auth.uid()` quand disponible.
- Corriger `voice_recovery_attempts` : il échoue car la table référence `profiles(id)` alors que le code envoie l’id auth. Je vais soit résoudre le bon `profiles.id`, soit ne pas envoyer `user_id` si le profil n’existe pas, pour que la récupération ne casse jamais.
- Les erreurs de logging resteront silencieuses côté UX : aucun log ne doit empêcher Alex de démarrer.

6. Améliorer le fallback chat
- Si la voix est indisponible, ouvrir automatiquement le chat avec un message utile.
- Conserver les éventuels transcripts déjà capturés.
- Ne plus afficher un écran d’erreur bloquant quand la meilleure expérience est de continuer en chat.

7. Backend associé
- Mettre à jour `alex-conversation-token` pour suivre le même pattern robuste que `voice-get-signed-url` : ne pas retourner un 500 non géré pour les pannes vocales récupérables; retourner un JSON structuré avec fallback chat.
- Ajouter les champs utiles au retour : `conversationToken`, `token`, `signedUrl`, `agentId`, et infos de fallback.
- Garder l’API key protégée côté backend uniquement.

Fichiers prévus
- `src/hooks/useLiveVoice.ts`
- `src/components/voice/OverlayAlexVoiceFullScreen.tsx`
- `src/hooks/useAlexVoiceRecovery.ts`
- `src/stores/alexVoiceLockedStore.ts`
- `supabase/functions/alex-conversation-token/index.ts`

Critères de succès
- Sur mobile, Alex ne reste plus bloqué sur “La voix d’Alex tarde à démarrer”.
- Si la voix démarre : salutation audible et état actif.
- Si la voix échoue : passage automatique au chat en quelques secondes.
- “Réinitialiser Alex” tue vraiment l’ancienne session et repart proprement.
- Les erreurs de logs RLS/FK ne cassent plus la récupération vocale.
- Aucun changement de design global, de pricing ou de structure de page.