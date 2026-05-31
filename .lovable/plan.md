## Problème

La route `/` pointe vers `PageHomeCinematic` (nouveau design), mais la route `/index` pointe toujours vers `PageHomeUnicorn` (ancien design SaaS). L'utilisateur est actuellement sur `/index` — il voit donc l'ancienne version.

`src/app/router.tsx:744` → `<Route path="/index" element={<PageHomeUnicorn />} />`

## Correctif

**1 fichier, 1 ligne :** `src/app/router.tsx`

Remplacer :
```tsx
<Route path="/index" element={<PageHomeUnicorn />} />
```
par :
```tsx
<Route path="/index" element={<PageHomeCinematic />} />
```

`PageHomeUnicorn` reste accessible via `/home-legacy` pour rollback.

## Vérification

Recharger `/index` sur mobile → doit afficher le hero cinématique sombre avec mega-input, plus le vieux bloc "Comment fonctionne UNPRO".
