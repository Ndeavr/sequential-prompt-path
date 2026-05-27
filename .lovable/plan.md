
# Refonte UI globale UNPRO — Light Premium Design System

Transformation **UI/UX uniquement**. Zéro changement métier, Supabase, RLS, Edge Functions, Stripe, routes admin.

## 1. Stratégie d'exécution

Plutôt que de réécrire 100+ pages, on **propage le thème via les tokens et les composants partagés**. 90% des pages héritent automatiquement.

```text
Tokens CSS (index.css) ──► Composants UI (button, card, input…) ──► Shells (Public/User/Contractor) ──► Pages
                                                                  └──► AlexOrb singleton global
```

Le thème actuel `.unicorn-theme` (déjà présent dans `src/styles/unicorn-theme.css`) sert de **base** : on le promeut en thème global par défaut au lieu d'un opt-in scopé.

## 2. Phase 1 — Fondation tokens (1 fichier, impact global)

**`src/index.css`** — Remplacer les tokens HSL `:root` par la palette light premium :

| Token | Valeur |
|---|---|
| `--background` | `#F7FAFF` |
| `--foreground` | `#0B1220` |
| `--primary` | `#2563FF` |
| `--primary-glow` | `#3B82F6` |
| `--accent` | `#BDE7FF` |
| `--muted-foreground` | `#667085` |
| `--success` | `#19C37D` |
| `--warning` | `#F59E0B` |
| `--destructive` | `#EF4444` |
| `--radius` | `1.5rem` (24px), `--radius-lg` 32px |
| `--shadow-glass` | `0 24px 60px -28px rgba(37,99,255,.22)` |
| `--shadow-glow` | `0 0 80px rgba(59,130,246,.35)` |
| `--gradient-primary` | `linear-gradient(135deg,#2563FF,#3B82F6)` |
| `--gradient-bg` | radial halos cyan/bleu sur blanc |

- Forcer **light mode par défaut** (`useThemeToggle` reste no-op mais inversé).
- Exclure `/admin/*` : wrapper `.admin-theme` qui réapplique l'ancienne palette dark (override scopé dans `index.css`).
- Garder le bg dark cinématique uniquement dans `.alex-immersive` (page Alex voix immersive).

## 3. Phase 2 — Composants partagés (déjà existants, à reskinner)

Mise à jour visuelle, **API inchangée** :

- `src/components/ui/button.tsx` — variants `default`, `premium`, `cinematic` utilisent le gradient bleu + halo + hover lift -2px
- `src/components/ui/card.tsx` — `glass-card` = `rgba(255,255,255,.72)` + `backdrop-blur(22px)` + shadow premium
- `src/components/ui/input.tsx` — devient **FloatingInput** : label flottant, focus glow bleu, radius 16px
- `src/components/shared.tsx` — `StatCard`, `EmptyState`, `PageHeader`, `Section` reskinnés glass

Nouveaux composants partagés dans `src/components/ds/` :

- `GlassCard.tsx`
- `GradientButton.tsx` (wrapper Button variant=premium)
- `IntentChip.tsx`
- `TrustBadge.tsx`
- `AISectionCard.tsx`
- `EmptyStateAI.tsx` (avec CTA Alex)
- `SmartListCard.tsx`
- `FloatingGlassHeader.tsx`
- `FloatingBottomDock.tsx` (Accueil / Croissance / Alex / Profil / Compte)
- `PageHero.tsx`

## 4. Phase 3 — Shells globaux

Standardiser les 3 layouts non-admin :

- `src/layouts/MainLayout.tsx` → utilise `FloatingGlassHeader` + `FloatingBottomDock` (mobile) + `<AlexOrbSingleton/>`
- `src/layouts/DashboardLayout.tsx` (homeowner) → idem + sidebar glass desktop
- `src/layouts/ContractorLayout.tsx` → idem accent contractor

`src/layouts/AdminLayout.tsx` (s'il existe) ou les pages `/admin/*` : wrapper `<div className="admin-theme">` pour bypass total.

## 5. Phase 4 — Alex singleton global

- Promouvoir `AlexOrb` en **singleton monté dans `App.tsx`** (pas dans chaque page).
- États visuels : `idle / listening / thinking / speaking / processing / success` (gradient + halos animés).
- Mémoire conservée entre routes (déjà géré par `AlexVoiceContext`).
- Caché uniquement sur `/admin/*` et `/auth/*` minimal.

## 6. Phase 5 — Pages spécifiques à retoucher

La majorité héritent via les tokens. Retouches ciblées sur :

| Page | Action |
|---|---|
| `Home.tsx` / `PageHomeIntentUNPRO.tsx` | Hero glass + halos cyan + AlexOrb central |
| `Login.tsx` / `LoginPageUnpro.tsx` | Card glass centrée, FloatingInput |
| Onboarding homeowner/entrepreneur | Steps glass + progress gradient |
| `ProDashboard.tsx`, `ProAccount.tsx`, `ProAppointments.tsx` | Remplacer tables denses par `SmartListCard` |
| Pages SEO (`/probleme/:x/:city`, `/ville/:x`) | **Garder structure H1/H2/JSON-LD intacte**, juste reskin cartes/CTA |
| Pages pricing | Cards glass + gradient CTA |
| `NotFound.tsx`, success/cancel | `EmptyStateAI` |
| Pages AIPP / soumissions | Glass + Alex CTA |

## 7. Hors-scope (intouché)

- `/admin/*` (toutes pages, layouts, Mission Control, Operations Hub, Outbound, Sniper, Plans Matrix, etc.)
- Logique métier, hooks, edge functions, migrations, types Supabase
- AlexBrain, prompts, voice config
- Stripe, RLS, auth flows

## 8. Détails techniques

- **Tailwind config** : ajouter `radius-2xl: 24px`, `radius-3xl: 32px`, keyframes `fade-up`, `glow-pulse`, `magnetic-hover`.
- **Animations** : `motion-safe` only, GPU `transform/opacity`, easing `cubic-bezier(.22,1,.36,1)`, 320–420ms.
- **Perf** : lazy-load images existantes, pas de nouveau script lourd, glass via `backdrop-filter` (fallback solid sur Android low-end via `@supports`).
- **Light mode forcé** : retirer `dark` class du `html`, garder `dark` scopé à `.admin-theme` et `.alex-immersive`.
- **Tests** : pas de nouveaux tests, vérification visuelle sur Home, Alex, Login, ProDashboard, AIPP, page SEO ville.

## 9. Critères de succès

- Toutes les pages non-admin partagent palette + glass + radius + shadows.
- Alex visible en singleton, jamais remonté entre routes.
- Aucune route admin modifiée (diff vide sur `src/pages/admin/**`).
- Mobile 384px clean (viewport actuel utilisateur).
- Aucune régression fonctionnelle (routes, formulaires, paiements inchangés).

## 10. Ordre d'exécution (build)

1. Tokens `index.css` + `tailwind.config.ts` + scope `.admin-theme`
2. Reskin `button`, `card`, `input`, `shared.tsx`
3. Créer `src/components/ds/*` (10 composants)
4. `FloatingGlassHeader` + `FloatingBottomDock` dans `MainLayout` / `DashboardLayout` / `ContractorLayout`
5. AlexOrb singleton dans `App.tsx`
6. Retouches ciblées Home / Login / Onboarding / Pro* / Pricing / SEO / NotFound
7. QA visuelle sur 8 pages clés en 384px
