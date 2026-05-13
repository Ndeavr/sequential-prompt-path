# Fix : la voix d'Alex ne démarre plus (Activer la voix → fallback chat)

## Diagnostic

Dans `src/hooks/useLiveVoice.ts` (lignes 379–392), la session ElevenLabs préfère désormais **WebRTC** (`conversationToken`) et tombe sur WebSocket uniquement si le token est absent. Or :

- L'edge `voice-get-signed-url` retourne presque toujours un `conversationToken`, donc on utilise systématiquement WebRTC.
- Les logs console montrent une connexion WebRTC (LiveKit room `RM_VGng5NG3hjja`) qui se déconnecte après ~8s avec `code 1006 / wasClean: false`, puis 10 tentatives de reconnect échouent toutes (`Failed to fetch / ServerUnreachable`). LiveKit abandonne après 48 s.
- Le SDK passe alors la session en `failed` → `AlexChatFallbackPanel` s'ouvre, d'où le bouton **"Activer la voix"** visible.
- La mémoire projet **`voice-connection-stability`** impose explicitement : *"uses signed URL"*, pas d'overrides client, agent ID strict. Le passage récent en WebRTC viole ce contrat — c'est ce qui « marchait hier ».

Cause racine : préférence WebRTC + token mono-usage non récupérable sur reconnect mobile = sessions qui meurent et n'arrivent jamais à reconnecter.

## Correctif (1 fichier, ~10 lignes)

**`src/hooks/useLiveVoice.ts`** lignes 379–392 :

1. Repasser **WebSocket signed URL en mode par défaut** (conforme à la mémoire `voice-connection-stability`).
2. Retirer la branche `if (conversationToken) { ... webrtc }`.
3. Garder le `conversationToken` retourné par l'edge pour usage futur (gated derrière un feature flag, désactivé par défaut), mais ne plus l'utiliser au runtime.

```ts
// Per memory `voice-connection-stability`: ALWAYS use signed URL (WebSocket).
// WebRTC reconnect on mobile fails after ~8s with code 1006 (LiveKit unreachable).
await conversation.startSession({
  signedUrl,
  connectionType: "websocket",
} as any);
```

## Vérifications

- Recharger `/` sur mobile → orb démarre, Alex parle dans les 2 s.
- Console : `[ElevenLabs V8] ✅ Session started` puis `agent_response` sans `code 1006`.
- Plus de `AlexChatFallbackPanel` au démarrage normal.
- Si la voix échoue vraiment (clé manquante, mic refusé), le fallback chat reste fonctionnel via le retry button.

## Hors scope

- Pas de changement DB, edge function, ni UI.
- Pas de touche au flow autostart (`useAlexHomeAutostart`) — le problème n'est pas l'autostart mais la stabilité de la connexion.
- Réintroduction WebRTC remise à plus tard (nécessite token-refresh côté SDK).
