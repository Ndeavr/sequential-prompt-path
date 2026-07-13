# Nettoyage complet de `unpro-logo-master.png` + explication du STATUS: ERROR

## Diagnostic

Ce que tu vois n'est pas un bug de code — c'est un problème de **déploiement**.

Les changements que j'ai poussés au tour précédent (`index.html`, `SeoHead.tsx`, `prerender`) vivent actuellement dans **le preview Lovable**, pas sur `https://unpro.ca`. L'outil `seo-og-inspect` fetch **le site publié**, qui sert encore l'ancien `index.html` compilé avant la mise à jour. C'est pour ça que :

- `og:image` = `unpro-logo-master.png` (ancien HTML compilé)
- `twitter:image` = idem
- STATUS: ERROR (mon test exige `unpro-og-v3.jpg` sur les deux champs)

**Le vrai déblocage = republier le frontend.** Tant que ce n'est pas fait, aucun changement de balise n'apparaîtra sur le domaine live, quel que soit le nombre d'itérations.

Deux edge functions déployées côté serveur au tour précédent (`prerender`, `seo-og-inspect`) sont, elles, déjà live.

## Sur les références `unpro-logo-master.png` restantes

Elles apparaissent encore à 5 endroits dans le code. **Aucune n'est utilisée comme `og:image` ou `twitter:image`** — je les ai grep-vérifiées :

| Fichier | Utilisation | Type |
|---|---|---|
| `index.html:55` | `Organization.logo` (JSON-LD Schema.org) | Logo de marque |
| `public/knowledge-graph.json:10` | `Organization.logo` (JSON-LD) | Logo de marque |
| `src/pages/ia-maison/PageIaMaisonArticle.tsx:44` | `Article.publisher.logo` (JSON-LD) | Logo publisher |
| `src/pages/PageHomeUnicorn.tsx:710` | `Organization.logo` (JSON-LD) | Logo de marque |
| `src/brand/unproIdentity.ts:43` | Identité de marque | Logo de marque |

Ces champs Schema.org attendent **un logo carré transparent**, pas une carte OG social 1200×630. Y coller `unpro-og-v3.jpg` casserait la validation Google Rich Results ("Logo does not fit dimension requirements" / ratio).

Mais l'ordre est clair : ne plus jamais voir `unpro-logo-master.png` dans le codebase. Je remplace donc toutes ces occurrences par le **logo canonique CDN déjà en place** (`src/config/branding.ts` → `BRAND.logo` = `unpro-logo-blue.png.asset.json`), qui est le vrai logo carré de la marque.

## Changements exécutés en build

1. `index.html:55` — remplacer `https://unpro.ca/unpro-logo-master.png` par l'URL CDN du logo canonique (`BRAND.logo` inliné)
2. `public/knowledge-graph.json:10` — idem
3. `src/pages/ia-maison/PageIaMaisonArticle.tsx:44` — importer `BRAND` et utiliser `BRAND.logo`
4. `src/pages/PageHomeUnicorn.tsx:710` — idem
5. `src/brand/unproIdentity.ts:43` — passer la valeur `logo` sur `BRAND.logo`
6. `src/seo/ogImage.ts` — retirer la mention `unpro-logo-master.png` du commentaire

Puis :
- `rg 'unpro-logo-master' .` doit retourner 0 résultat (hors `node_modules`)
- `og:image` et `twitter:image` continuent de pointer vers `unpro-og-v3.jpg?v=20260712` (déjà fait au tour précédent)

## Améliorations mineures `/admin/seo-health`

- Bouton toggle **"Tester le preview Lovable"** qui remplace `https://unpro.ca` par l'URL preview courante dans les 7 routes-clés. Comme ça, tu peux valider **avant** de publier que le nouveau HTML est bien en place, puis publier en confiance.
- Ligne d'info explicite : "Cet outil analyse le HTML rendu sur l'URL fournie. Un changement dans le code n'apparaît sur unpro.ca qu'après publication."
- Le status devient **OK** dès que `og:image` ET `twitter:image` contiennent `unpro-og-v3.jpg` (déjà le cas de la logique actuelle).

## Rapport post-changement

Je livre à la fin :

| Fichier | Ancienne valeur | Nouvelle valeur | Route affectée |
|---|---|---|---|
| index.html | `.../unpro-logo-master.png` | `BRAND.logo` (CDN) | Toutes routes (JSON-LD Org sitewide) |
| public/knowledge-graph.json | idem | idem | Sitewide |
| PageIaMaisonArticle.tsx | idem | `${BRAND.logo}` | /ia-maison/:slug |
| PageHomeUnicorn.tsx | idem | `BRAND.logo` | /home-unicorn |
| src/brand/unproIdentity.ts | idem | `BRAND.logo` | Global |

Zéro occurrence restante de `unpro-logo-master.png`.

## Ce que je NE fais PAS

- Je ne remplace pas les logos JSON-LD par la carte OG 1200×630 — Google Rich Results rejette ça. Ce sont deux champs sémantiquement distincts.
- Je ne peux pas forcer la publication du frontend — c'est une action côté toi (bouton Publish). Après le build ci-dessus, ce sera **le seul geste restant** pour que STATUS passe à OK sur `unpro.ca`.

Confirme et je build.
