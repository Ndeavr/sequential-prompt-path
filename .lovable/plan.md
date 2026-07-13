# Remplacement global de l'image Open Graph UNPRO

Note importante sur la stack : ce projet est un **Vite + React SPA**, pas Next.js. Il n'y a pas de `app/layout.tsx` ni d'objet `metadata`. Les balises OG vivent dans :

1. `index.html` (fallback statique — ce que voient Facebook / LinkedIn / SMS / iMessage / X, qui n'exécutent pas JS)
2. `src/seo/components/SeoHead.tsx` (mutation runtime pour Googlebot)
3. `supabase/functions/prerender/index.ts` (HTML servi aux crawlers)

Je vais faire l'équivalent fonctionnel de la demande dans cette architecture.

## 1. Nouvel asset OG

- Prendre l'image uploadée (mockup UNPRO, format paysage) et la recadrer en **1200×630** via `imagegen--edit_image` pour un vrai ratio OG (le mockup actuel n'a pas ce ratio).
- Écrire dans `public/og/unpro-og-v3.jpg` (chemin exact demandé).
- Ajouter aussi `public/og/unpro-og-v3.png` seulement si nécessaire; sinon on garde JPG.

## 2. URL canonique OG unique

Constante partagée :
```
https://unpro.ca/og/unpro-og-v3.jpg?v=20260712
```

Ajouter `src/seo/ogImage.ts` exportant `DEFAULT_OG_IMAGE` pour que toutes les futures pages héritent automatiquement.

## 3. `index.html`

Remplacer les deux références actuelles :
- `og:image` = `https://unpro.ca/unpro-logo-master.png`
- `twitter:image` = `https://unpro.ca/unpro-logo-master.png`

par la nouvelle URL avec `?v=20260712`, plus `og:image:width=1200` / `height=630` / `og:image:type=image/jpeg` / `og:image:alt`.

## 4. `SeoHead.tsx`

- Importer `DEFAULT_OG_IMAGE` et l'utiliser comme fallback quand le prop `ogImage` est absent (aujourd'hui les pages sans `ogImage` n'écrivent aucune balise `og:image` → elles héritent d'`index.html`, ce qui est OK, mais on veut aussi couvrir les pages qui passent une image legacy).
- Forcer `twitter:card = summary_large_image` dès qu'on a un fallback.

## 5. `supabase/functions/prerender/index.ts`

Remplacer le fallback `${BASE}/og-default.png` par `${BASE}/og/unpro-og-v3.jpg?v=20260712`. Redéployer la function.

## 6. Scan et nettoyage des références legacy

Rechercher et remplacer dans tout le repo (hors `node_modules`, `.lovable/`, migrations SQL historiques) les occurrences de :
- `og-image.jpg`, `/og-image`, `og-default.png`
- `unpro-logo-master.png` utilisé comme OG
- anciens PNG "fleur-de-lys" / "infinity" s'il en reste
- Anciennes images générées dynamiquement qui pointent encore vers du legacy

Zones connues à vérifier après scan :
- `src/pages/ai/PageAiEntity.tsx`
- `src/pages/blog/BlogArticlePage.tsx`
- `src/pages/admin/share-images/PageShareImageGenerate.tsx`
- `supabase/functions/aipp-v2-analyze/index.ts`
- `supabase/functions/blog-image-generator/index.ts`
- `supabase/functions/domain-intelligence/index.ts`
- `public/llms-full.txt`, `public/sitemap-blog.xml`

Les pages qui **génèrent** une image dédiée (share cards blog, AI entity, share-image admin) gardent leur image dédiée — la consigne dit "unless a custom image is explicitly generated".

## 7. Cache-busting

`?v=20260712` ajouté partout où l'URL est écrite en dur. Les crawlers social sont invalidés automatiquement puisque l'URL change.

## 8. Nouvelle page `/admin/seo-health`

Fichier `src/pages/admin/PageAdminSeoHealth.tsx` + route dans le registre admin.

Fonctionnalités :
- Champ texte pour tester n'importe quelle URL du site
- Bouton "Analyser" → appelle une nouvelle edge function `seo-og-inspect` qui :
  - fetch l'URL cible (via prerender pour voir ce que voient les crawlers)
  - extrait `og:title`, `og:description`, `og:image`, `twitter:image`, `twitter:card`, `canonical`
  - retourne `ok` si `og:image` = URL v3 attendue, sinon `ERROR` + raison
- Tableau récapitulatif des routes clés testées d'un coup :
  `/`, `/entrepreneurs`, `/gestion-copropriete-quebec`, `/journal`, `/entrepreneur/:slug` (échantillon), `/ville/:slug` (échantillon), `/services/:slug` (échantillon), `/alex`, `/passeport-maison`, `/recommandations`
- Colonnes : URL, OG title, OG description, OG image, Twitter image, Statut
- Liens directs "Tester sur" → Facebook Sharing Debugger, LinkedIn Post Inspector, X Card Validator, Google Rich Results (préviews externes, ouverts dans un nouvel onglet — les crawlers eux-mêmes ne s'appellent pas côté serveur mais on fournit un lancement en un clic pour chaque plateforme)

Note : Facebook / LinkedIn / X / Messenger / iMessage / Google Messages ne sont pas testables server-to-server sans clé API dédiée. On offre donc :
- **Validation automatique** = fetch + parsing OG local (source de vérité identique à ce que le crawler lit)
- **Validation manuelle en un clic** = liens vers les debuggers officiels de chaque plateforme préremplis avec l'URL

## 9. Critères de succès vérifiés

Après implémentation :
- `rg` confirme 0 référence legacy (`og-image.jpg`, `unpro-logo-master.png` en OG, `og-default.png`)
- `/admin/seo-health` retourne OK pour toutes les routes-clés
- Preview SMS/iMessage = nouveau visuel (après refresh cache social via debuggers officiels)
- Nouvelle page = héritage automatique via `DEFAULT_OG_IMAGE`

## 10. Ce que je NE fais PAS

- Pas de migration vers Next.js `app/layout.tsx` (n'existe pas dans ce projet)
- Pas d'appel serveur non authentifié aux APIs Facebook/LinkedIn/X (nécessite tokens, hors scope)
- Pas de suppression des images de partage dynamiques (blog, AI entity, share-image admin) — elles sont volontairement custom
- Pas de changement au SMS outbound / Twilio pipeline (indépendant)

Confirme et je passe en build.
