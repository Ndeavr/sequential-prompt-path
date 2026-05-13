# UNPRO — Pages Profil Entreprise SSR (`/entrepreneur/:slug`)

Adapter le brief Next.js au stack réel (Vite + React + edge prerender Deno) sans casser l'architecture existante. Une page = une référence canonique pour les LLM et Google.

## 1. Architecture SSR (sans Next.js)

```
Bot/Crawler ──► Cloudflare/Vercel UA detect
              └► api.unpro.ca/prerender?url=/entrepreneur/:slug
                 └► Deno edge: fetch DB ► render full HTML + JSON-LD
                                          (zero JS dépendance above-the-fold)

Humain ──────► unpro.ca/entrepreneur/:slug (SPA hydratée, même contenu)
```

- Réutilise la fonction edge **`prerender`** déjà déployée. On ajoute un handler `entrepreneur/:slug` qui rend le HTML complet côté serveur (template string typé, pas de React SSR).
- Côté SPA : composant `EntrepreneurProfilePage` qui rend le même contenu (même DOM structure pour parité crawler/humain) avec `react-helmet-async`.
- UA detect existant dans `prerender` (Googlebot, GPTBot, ClaudeBot, PerplexityBot, etc.) — on étend la liste si besoin.

## 2. Route & registry

- Route React : `/entrepreneur/:slug` (déjà réservée). Ajouter dans `src/app/router.tsx`.
- Lookup DB par `contractor_public_pages.slug` → join `contractors` + `contractor_aipp_scores` (current) + `contractor_media` + `reviews`.
- 404 propre si slug introuvable ou `is_published = false`.

## 3. Sections de la page (ordre exact du brief)

1. **`<head>`** — `<title>` + meta description uniques, `lang="fr-CA"`, canonical `https://unpro.ca/entrepreneur/:slug`, OG tags complets, Twitter card.
2. **JSON-LD** — 2 blocs :
   - `LocalBusiness` / `HomeAndConstructionBusiness` (nom, adresse, ville QC, téléphone, aggregateRating, areaServed, serviceType, license RBQ).
   - `Review` × max 3 (auteur, ratingValue, datePublished, reviewBody).
   - Bonus : `BreadcrumbList` (Accueil › Entrepreneurs › Ville › Nom).
3. **Hero** — H1 (nom), H2 (spécialité), ville · RBQ · étoiles, CTA `Obtenir une soumission` + `Voir les projets`, badge `Vérifié` si applicable.
4. **À propos** — bio FR (2-3 paragraphes), année fondation, taille équipe, chips spécialités, mini-carte zone (image statique).
5. **Galerie projets** — 3-6 cartes (photo, type, ville, année), liens `/entrepreneur/:slug/projets/:id` (route stub).
6. **Avis** — score agrégé proéminent, 5 reviews max (étoiles, prénom + initiale, date, corps).
7. **Widget AIPP** ⭐ — score réel depuis `contractor_aipp_scores` (current). Affichage proud : score global + 5 sous-scores (Web/20, Google/20, Trust/20, AI/25, Conv/15). Tooltip "C'est quoi AIPP?" + lien explicatif.
8. **Footer CTA** — phone click-to-call (`tel:`), formulaire minimal (nom, courriel, description, date préférée) → insert dans `leads` table, lien retour vers liste entrepreneurs.

## 4. Données

Sources existantes :
- `contractors` (business_name, city, license_rbq, phone, bio, specialty_tags, founded_year, team_size, verified, slug)
- `contractor_public_pages` (slug, is_published, hero copy)
- `contractor_aipp_scores` (is_current, scores 5 axes)
- `contractor_media` (photos projets, is_approved)
- `reviews` (rating, reviewer_name, body, created_at)
- `leads` (insert depuis form)

Aucune migration nécessaire si ces colonnes existent. Sinon, migration ciblée pour `founded_year`, `team_size` si manquantes.

## 5. Seeds (3 profils FR réalistes)

Migration dédiée insérant :
- `construction-gagnon` — Montréal, cuisine + salle de bain, 4.8★, 12 reviews, vérifié
- `toitures-beaupre` — Québec, toiture, 4.5★, 7 reviews, non vérifié
- `renovations-lafortune` — Laval, général, 4.2★, 3 reviews, vérifié

Bios, projets et reviews écrits en français québécois réaliste (pas de lorem). Scores AIPP cohérents avec les profils.

## 6. Critères d'acceptation

- [ ] `curl -A "Googlebot" https://unpro.ca/entrepreneur/construction-gagnon` retourne HTML complet avec contenu visible (view-source test).
- [ ] JSON-LD valide sur validator.schema.org (LocalBusiness + Reviews + Breadcrumb).
- [ ] `<title>` et `<meta description>` uniques + keyword-rich par entreprise.
- [ ] Widget AIPP affiche les 5 sous-scores réels depuis DB.
- [ ] Mobile-first, Lighthouse perf > 90 (HTML statique côté bot, hydratation différée côté humain).
- [ ] `lang="fr-CA"` partout, copy 100% français.
- [ ] OG tags par entreprise (image hero contractor si dispo, sinon fallback brand).
- [ ] Form contact insère dans `leads` avec validation Zod côté edge.

## 7. Hors scope (à ne pas faire)

- Pas de migration vers Next.js.
- Pas de SPA-only rendering pour ces pages (parité bot/humain obligatoire).
- Pas de lorem ipsum.
- Pas de masquage du score AIPP — toujours proéminent.
- Pas de stub `/projets/:id` complet (juste route placeholder).

## 8. Détails techniques

**Fichiers créés/modifiés** :
- `supabase/functions/prerender/index.ts` — ajouter handler `entrepreneur/:slug` (fetch DB, build HTML string avec JSON-LD inline).
- `src/pages/entrepreneur/EntrepreneurProfilePage.tsx` — composant SPA mirror.
- `src/components/entrepreneur/AippScoreWidget.tsx` — widget réutilisable.
- `src/components/entrepreneur/ContactStrip.tsx` — form CTA.
- `src/hooks/useContractorPublicProfile.ts` — fetch unifié (peut réutiliser `useContractorFullProfile`).
- `src/app/router.tsx` — ajout route `/entrepreneur/:slug`.
- `supabase/migrations/<timestamp>_seed_3_entrepreneurs.sql` — seeds réalistes.

**Performance** :
- Edge prerender met en cache CDN (Cloudflare) avec `Cache-Control: public, max-age=300, s-maxage=3600`.
- Hydration SPA différée (`suspense` + lazy).
- Images via `cdn.unpro.ca` avec `loading="lazy"` sauf hero.

**Sécurité** :
- Form contact : validation Zod (longueur, email), rate limit IP-based dans edge.
- RLS : `contractor_public_pages` lisible par `anon` quand `is_published = true` uniquement (vérifier policy existante).

**Phase 2** (hors scope MVP) :
- Pages `/entrepreneur/:slug/projets/:id`
- Sitemap.xml automatique pour tous les slugs publiés
- A/B test des hero CTA via existing optimization engine
