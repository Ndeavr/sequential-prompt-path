# Alex — Ouverture contextuelle dès le tap

## Objectif

Quand l'utilisateur touche une tuile **« Ce qu'Alex peut faire »** ou un **chip de suggestion** sous le champ de question, Alex démarre la voix immédiatement avec une première phrase personnalisée et contextuelle :

> « Bonjour {Prénom}. Je peux définitivement vous aider avec {sujet}. Dites-m'en plus. »

Sans prénom : « Bonjour. Je peux définitivement vous aider avec {sujet}. Dites-m'en plus. »

Pas de redesign, pas de nouvelle surface — on s'appuie sur l'overlay voix existant (`OverlayAlexVoiceFullScreen` → `useLiveVoice`) et sur `openAlex(feature, contextHint)`.

## Mapping sujet (FR-CA)

**Tuiles capability** (`AlexCapabilitiesStrip`) :
- Comprendre un problème → « comprendre votre problème »
- Analyser une photo → « l'analyse d'une photo »
- Estimer un coût → « estimer un coût »
- Comparer une soumission → « comparer votre soumission »
- Trouver des subventions → « trouver vos subventions »
- Recommander un professionnel → « vous recommander le bon professionnel »

**Chips de suggestion** (`QUICK_CHIPS` dans `PageHomeUnicorn`) :
- Mon sous-sol sent l'humidité → « l'humidité de votre sous-sol »
- Est-ce un problème de fondation? → « votre fondation »
- Je veux rénover ma cuisine → « la rénovation de votre cuisine »
- Ma thermopompe fait du bruit → « votre thermopompe »
- J'ai reçu une soumission → « l'analyse de votre soumission »
- Ai-je droit à une subvention? → « vos subventions »

## Changements

### 1. `src/components/home-unicorn/AlexCapabilitiesStrip.tsx`
- Ajouter un `topic` à chaque entrée `CAPABILITIES`.
- Transformer chaque tuile en `<button>` qui appelle `openAlex("home_capability", topic)` (via `useAlexVoice`).
- Conserver le style glass actuel — aucun changement visuel autre que `cursor-pointer` + `active:scale-[0.98]` pour le feedback tactile.

### 2. `src/pages/PageHomeUnicorn.tsx`
- Remplacer `QUICK_CHIPS` (string[]) par un tableau `{ label, topic }`.
- Au clic sur un chip, appeler `onTalk(topic)` au lieu du libellé brut, afin que le `contextHint` envoyé à l'overlay soit déjà formulé pour la phrase d'ouverture.
- `onTalk` reste inchangé (`openAlex("home_intent", hint)`).

### 3. `src/components/voice/OverlayAlexVoiceFullScreen.tsx`
- Lire `contextHint` depuis le `alexVoiceLockedStore` (déjà stocké lors de `openVoiceSession`).
- Étendre `buildGreeting` :
  - Si `contextHint` est présent → `"${time}${firstName ? ' ' + firstName : ''}. Je peux définitivement vous aider avec ${contextHint}. Dites-m'en plus."`
  - Sinon → comportement actuel inchangé.
- Le `greeting` produit est déjà passé à `useLiveVoice` (`initialGreeting`) qui le pousse en `firstMessage` aux overrides ElevenLabs et au fallback TTS, donc Alex le prononcera dès l'ouverture.

### 4. Aucune autre modification
- Pas de touche au prompt système, au routing, à `useLiveVoice`, à `alexAgentOverrides`, ni au store de session Alex (pas de breaking change sur les autres surfaces).
- Pas de changement aux pages autres que `PageHomeUnicorn`.
- Pas de changement à la voix (Sophia reste verrouillée).

## Vérification

- Taper « Comprendre un problème » → overlay s'ouvre, Alex dit « Bonjour Yanick. Je peux définitivement vous aider avec comprendre votre problème. Dites-m'en plus. »
- Taper le chip « Ma thermopompe fait du bruit » → « …je peux définitivement vous aider avec votre thermopompe. Dites-m'en plus. »
- Toucher l'orb central (sans contexte) → comportement actuel inchangé (« Bonjour Yanick. Je vous écoute. »).
- Fallback chat (si la voix échoue) : la bulle d'ouverture utilise le même greeting (déjà géré dans l'overlay).
