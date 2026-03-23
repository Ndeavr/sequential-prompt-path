

# Alex doit engager la conversation en premier — partout

## Problème
Quand l'utilisateur ouvre Alex (menu, orb, bouton), Alex attend passivement que l'utilisateur parle ou écrive. Alex ne dit rien. L'utilisateur voit juste un micro et doit deviner quoi faire.

## Solution
Alex doit envoyer un message de bienvenue automatiquement dès l'ouverture, puis démarrer l'écoute après avoir parlé.

### Step 1 — Ajouter un greeting automatique dans AlexVoiceMode
Quand le composant monte et que le `sessionId` est prêt, envoyer automatiquement un message système d'introduction à l'endpoint `alex-voice` avec `action: "greet"` (ou réutiliser `action: "respond"` avec un message d'amorce interne). Alex génère sa salutation contextuelle (heure, page, rôle) et la joue en audio. Après la lecture audio, le micro s'active automatiquement.

Concrètement dans `AlexVoiceMode.tsx`:
- Nouveau `useEffect` qui se déclenche quand `sessionId` est prêt
- Appelle `handleGreeting()` qui envoie une requête `action: "greet"` au backend
- Le backend retourne texte + audio de salutation
- Le texte s'affiche comme message assistant
- L'audio se joue
- Après `audio.onended`, `startListening()` se déclenche

### Step 2 — Mettre à jour GlobalAlexOverlay
Passer `autoStart={false}` explicitement — le greeting gère maintenant le démarrage. L'utilisateur n'a plus besoin d'appuyer sur le micro.

### Step 3 — Mettre à jour l'inline Home
Même logique: quand Alex s'ouvre inline sur la Home, le greeting se joue immédiatement.

### Step 4 — Fallback si le backend greeting échoue
Si l'appel greeting échoue, afficher un message local par défaut ("Bonjour! Comment puis-je vous aider?") et démarrer l'écoute quand même.

## Résultat
- Alex parle en premier partout (menu, orb, inline, mobile)
- L'utilisateur entend immédiatement Alex
- Le micro s'active après qu'Alex ait fini de parler
- Aucune attente passive

