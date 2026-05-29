
# Réintégration des fonctions du header + audit global des liens brisés

## 1. Header — Zone 4 (la zone encerclée)

Diagnostic confirmé : sur mobile (384px) les 4 boutons (FR, cloche, QR, avatar P) s'affichent mais aucun clic n'ouvre quoi que ce soit.

Causes probables identifiées dans `SmartHeader.tsx` :
- L'orbe global `AlexCompanionOrb` (md+) et l'overlay `FloatingAlexGuide` placés par-dessus le header interceptent les taps via un wrapper `fixed inset-0` sans `pointer-events:none`.
- Les CTA conditionnels (`SmartCTA`, le bouton "P"/ProfileMenu) sont rendus avant que `useAuth().isLoading` soit `false`, ce qui laisse le `DropdownMenu` Radix dans un état détaché (trigger sans portail attaché).
- `MenuQuickActionsContextual variant="header"` est rendu sans `hidden lg:flex`, donc il vole le `flex-1` sur mobile et pousse les boutons hors de la zone tappable.

Actions :
- `SmartHeader.tsx`
  - Wrapper `MenuQuickActionsContextual` dans `hidden lg:flex` pour ne pas voler l'espace mobile.
  - Wrapper le `<header>` dans un conteneur avec `relative z-[60]` et ajouter `pointer-events-auto` explicite sur la zone 4.
  - Gating de rendu : utiliser `useAuth().isLoading` — afficher un skeleton (3 ronds gris) tant que `isLoading`, puis le vrai contenu (évite le ProfileMenu cassé).
  - Le bouton Bell doit toujours s'afficher si `ctx` (pas seulement si `notificationsCount > 0`) et router vers `/dashboard/notifications`.
- `MainLayout.tsx`
  - Ajouter `pointer-events-none` au div des 3 layers de fond et `pointer-events-auto` sur le `<main>`/header (les layers sont déjà `-z-10` mais le wrapper `fixed inset-0 noise-overlay` peut intercepter selon le navigateur mobile).
  - S'assurer que `AlexCompanionOrb` et tout overlay flottant utilisent `pointer-events-none` sur leur backdrop et `pointer-events-auto` uniquement sur l'orbe lui-même.
- `ProfileMenu.tsx` / `LanguageToggle.tsx` / `QRShareSheet.tsx`
  - Vérifier que chaque `DropdownMenu.Trigger` est en `asChild` correct et que les portails ont un `z-index > 60`.

## 2. Audit global des liens brisés

Méthode :
1. Extraire toutes les destinations `<Link to=...>`, `navigate(...)`, `href="/..."` du repo (`src/**`).
2. Croiser avec les routes définies dans `src/app/router.tsx` + `src/config/routesConfig.ts` + `src/config/routeRegistry.ts`.
3. Produire un rapport `docs/broken-links-audit.md` listant chaque lien orphelin avec : fichier:ligne → route → action recommandée (créer page placeholder, rediriger, ou supprimer le CTA).
4. Pour chaque lien orphelin haute-priorité (header, bottom nav, profil, CTA principaux), soit ajouter la route manquante dans router.tsx, soit rediriger vers la bonne route existante via une entrée dans le router avec `<Navigate>`.

## 3. Bottom nav (Accueil/Croissance/Alex/Profil/Compte)

Vérifier que les 5 onglets pointent vers une route existante. Si "Croissance" ou "Compte" ne mappent rien, mapper :
- Accueil → `/`
- Croissance → `/pro/dashboard` (contractor) ou `/dashboard` (homeowner) selon `activeRole`
- Alex → ouvre l'overlay voix (déjà branché)
- Profil → `/pro/account` ou `/dashboard/account` selon rôle
- Compte → `/dashboard/account`

## 4. Livrables

- `src/components/navigation/SmartHeader.tsx` — gating loading + pointer-events + nav contextuelle masquée mobile
- `src/layouts/MainLayout.tsx` — durcissement pointer-events des couches background
- `src/components/home-unicorn/BottomDockGlass.tsx` — route mapping par rôle
- Nouveau script ponctuel d'audit (exec) → `docs/broken-links-audit.md`
- Création/redirection des routes manquantes critiques dans `src/app/router.tsx`

## Critères de succès

- Sur mobile, les 4 boutons FR/cloche/QR/avatar répondent au tap et ouvrent leur menu/sheet.
- Aucun `Link` ou `navigate` dans `src/**` ne pointe vers une route absente du router.
- Le rapport d'audit est livré dans `docs/broken-links-audit.md`.
- Aucun changement de design system, palette, ou logique métier.

## Hors scope

- Refonte visuelle du header.
- Refonte du système d'auth / rôles.
- Modifications backend (Supabase) — uniquement frontend/presentation.
