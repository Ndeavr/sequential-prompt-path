## Objectif
Rendre le site rapide, débloquer les boutons de rôle, transformer le chat en extension naturelle d'Alex, et garantir que les nouvelles pages chargent — **sans toucher à la logique métier ni aux moteurs déjà en place**.

## Principe directeur
Aucune suppression. Aucune réécriture profonde. Uniquement des correctifs ciblés en surface (UI, guards, lazy loading, état) et des garde-fous.

---

## 1. Boutons de rôle qui ne réagissent pas (`/onboarding`)

**Cause identifiée**: `OnboardingPageUnpro.tsx` exige `user.id` avant d'accepter un clic. Si l'utilisateur n'est pas authentifié → silent fail ou toast + redirect vers `/login` qui ne déclenche rien visible sur mobile (toast caché derrière clavier/chat).

**Correctifs**:
- `FormRoleSelection`: stocker le rôle choisi en `sessionStorage` immédiatement (feedback visuel instantané, état "selected").
- `OnboardingPageUnpro.handleRoleSelect`: si non connecté → naviguer **directement** vers `/login?intent=onboarding&role=X` au lieu d'afficher uniquement un toast.
- Ajouter `disabled`/`loading` visuels sur la carte cliquée.
- Au retour de login, lire `sessionStorage.pendingRole` et reprendre l'étape 1.

## 2. Chat Alex caché derrière l'overlay vocal

**Cause**: la barre d'onglets (Accueil / Pro / Alex / Soumissions / Compte) recouvre le bas du sheet de chat; le champ de saisie n'est plus accessible. Sur `/alex/voice`, le chat affiche les messages mais sans champ de saisie visible — le clavier mobile réduit le viewport.

**Correctifs (UI uniquement)**:
- Ajouter `padding-bottom: calc(env(safe-area-inset-bottom) + 88px)` sur le conteneur du chat.
- Utiliser `visualViewport` pour repositionner le composer au-dessus du clavier (déjà documenté dans `mem://features/conversational-lite-homepage` — l'appliquer aussi à `/alex/voice`).
- Garantir un `<AlexInput>` toujours présent (fallback texte) sous l'orbe vocal, même en mode voix → "le chat = extension de la voix d'Alex".
- Z-index: composer au-dessus de la `BottomNav`, ou masquer la `BottomNav` quand le chat est ouvert plein écran.

## 3. Site très lent + nouvelles pages qui ne chargent pas

**Causes probables** (déjà partiellement diagnostiquées dans la mémoire de session précédente):
- 186 scripts / 1.9MB initial; `@elevenlabs/react` chargé partout.
- `BlogArticlePage` corrigé, mais d'autres pages héritent du même pattern de `useQuery` sans timeout/erreur visible.
- `useAlexHomeAutostart` peut se déclencher hors `/`.

**Correctifs ciblés (non destructifs)**:
- Vérifier que TOUTES les routes de `router.tsx` utilisent `lazy()` + `<Suspense fallback={<LazyFallback/>}>` — auditer et compléter là où il manque (ex: `Home`, `FallbackRoutePage` actuellement importés en dur).
- Convertir `@elevenlabs/react` en `import()` dynamique côté `useAlexConversation` et `useAlexVoiceInput` (déclenché uniquement à `openAlex()`).
- Ajouter un `useLoadingTimeout(4000)` standard à toutes les pages affichant "Chargement…" → fallback CTA "Réessayer / Retour".
- Confirmer que le preload `hero-bg.webp` est bien retiré (déjà fait).
- Ajouter un composant global `<GlobalLoadTimeoutBanner>` (8s) qui propose "Recharger" si l'app reste figée.

## 4. Garde-fous anti-régression

- **Ne pas toucher** à: `src/integrations/supabase/*`, edge functions, schéma DB, moteurs de matching/prediction/booking, `alexRuntimeSingleton`, prompts Alex.
- Tous les changements en frontend uniquement (pages, composants, hooks UI, CSS).
- Aucune migration SQL.
- Logger chaque correctif dans `system_events` pour observabilité.

---

## Détails techniques

### Fichiers modifiés
1. `src/pages/OnboardingPageUnpro.tsx` — handler de rôle non-bloquant
2. `src/components/onboarding/FormRoleSelection.tsx` — état visuel + sessionStorage
3. `src/components/layout/BottomNav.tsx` (à confirmer) — masquer en mode chat plein écran
4. `src/pages/AlexVoicePage.tsx` — afficher composer texte permanent + visualViewport
5. `src/styles/alex-overlays.css` — safe-area + z-index
6. `src/app/router.tsx` — `lazy()` manquants
7. `src/hooks/useAlexConversation.ts` + `useAlexVoiceInput.ts` — dynamic import ElevenLabs
8. `src/hooks/useAlexHomeAutostart.ts` — restreindre aux surfaces produit
9. `src/components/system/GlobalLoadTimeoutBanner.tsx` — nouveau, monté dans `Providers`
10. `src/app/providers.tsx` — monter le banner

### Hors scope (refusé explicitement)
- Refonte des moteurs Alex / orchestration
- Modification de la DB ou des RLS
- Suppression de pages, routes, ou composants existants
- Changement de la voix Alex / agent ID

### Critères de succès
- `/onboarding`: clic sur rôle → réaction visuelle <100ms, navigation cohérente
- `/alex/voice`: champ texte toujours visible et utilisable, même clavier ouvert
- FCP < 4s sur mobile 4G simulé
- Toute page qui charge >4s affiche un CTA de récupération
- Aucune route existante ne 404 ou ne reste figée sur "Téléchargement"
