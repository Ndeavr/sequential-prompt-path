## Root cause analysis

Le crash visible n'est **pas** dans la logique de `PageAdminAcquisitionFunnel` (la page `/admin/revenue-intelligence`). Les logs console le prouvent :

```
[AppErrorBoundary] stale chunk detected — reloading once
TypeError: Failed to fetch dynamically imported module:
  https://…/assets/PropertyTypeCityPage-DHtpAA7T.js
```

- Le navigateur tente de charger un **chunk Vite obsolète** (`PropertyTypeCityPage-DHtpAA7T.js`) qui n'existe plus après le dernier déploiement.
- `AppErrorBoundary` recharge une fois via sessionStorage, mais si le second fetch échoue aussi → écran « Une erreur est survenue ».
- L'utilisateur perçoit que `/admin/revenue-intelligence` crash, alors que c'est un import dynamique périmé déclenché par préchargement / cache.

Les requêtes Supabase de la page sont déjà tolérantes (`(supabase as any).from(...)` + `?? []`) — pas la source du crash, mais la robustesse globale est faible : une exception future dans n'importe quelle carte ferait sauter toute la page.

## Plan

### 1. Corriger la cause réelle — stale chunk recovery (permanent)

Créer `src/lib/lazyWithRetry.ts` :

- Wrapper autour de `lazy(() => import(...))`.
- Si le `import()` échoue avec `Failed to fetch dynamically imported module` ou `Importing a module script failed`, on retry une fois avec un cache-buster (`?v=<timestamp>`).
- Si le retry échoue, on force `window.location.reload()` **une seule fois** par session (sessionStorage flag `__lazy_reload_<chunk>`), puis on rejette proprement.
- Remplace tous les `lazy(() => import(...))` de `src/app/router.tsx` par `lazyWithRetry(() => import(...))` (un seul `sed` ciblé).

Effet : plus jamais d'écran « Une erreur est survenue » sur stale chunk — la page se recharge silencieusement avec les nouveaux hashes.

### 2. Ajouter des Error Boundaries par section (ce que le user a demandé)

Créer `src/components/admin/SectionErrorBoundary.tsx` :

- Petit class component React qui catch les erreurs.
- UI fallback compacte : icône ⚠, titre « Composant indisponible », message d'erreur tronqué, bouton « Réessayer » qui reset l'état.
- Props : `title`, `onRetry?`, children.

### 3. Refactor `src/pages/admin/PageAdminAcquisitionFunnel.tsx`

- Splitter `load()` en 3 requêtes indépendantes (`loadFunnel`, `loadFindings`, `loadLatestRun`) chacune avec son propre try/catch et état `{ data, error, loading }`.
- Wrapper chaque `<Card>` avec `<SectionErrorBoundary title="…">`.
- Sections wrappées : Status banner, Audit summary, Silent failures, Data availability, Event validation, Funnel, Top fuites.
- Garde-fous null :
  - `latestRun.started_at` peut être null → `new Date(... ?? Date.now())` + fallback « — ».
  - `data_availability` / `event_counts` : vérifier `typeof v === "object" && v !== null` avant `v.rows` / `v.status` / `v.total`.
  - `silent_failures` : déjà guard `Array.isArray`.
- Si une requête échoue avec un code Postgres `42P01` (table absente) ou `42501` (permission), afficher dans la section un état « Source indisponible » + détail, **sans** propager.

### 4. Vérifier les tables référencées

Lancer une lecture rapide (`information_schema.tables`) pour confirmer que `acquisition_funnel_state`, `acquisition_findings`, `acquisition_audit_runs` existent bien (la dernière migration les a étendues mais on revalide). Si l'une manque, on ajoute la migration correspondante — sinon, pas de changement DB.

## Files touched

```
NEW  src/lib/lazyWithRetry.ts
NEW  src/components/admin/SectionErrorBoundary.tsx
EDIT src/app/router.tsx                          (lazy → lazyWithRetry)
EDIT src/pages/admin/PageAdminAcquisitionFunnel.tsx
```

## Out of scope

- Pas de changement à la logique de l'edge function `acquisition-pipeline-audit` (déjà v2 télémétrique).
- Pas de refonte UI du dashboard.
- Pas d'autres pages admin (les error boundaries arrivent ici en premier, on étend ensuite si la pattern est validée).

## Success criteria

- `/admin/revenue-intelligence` ne crash plus, même quand le navigateur a un chunk périmé en cache.
- Si `acquisition_funnel_state` retourne 0 rows ou une erreur, seule la carte concernée affiche « Composant indisponible · Réessayer » — le reste du dashboard reste vivant.
- Stack trace exact + cause précise tracés dans la console de chaque SectionErrorBoundary (`console.error("[SectionErrorBoundary]", title, error, errorInfo)`).
