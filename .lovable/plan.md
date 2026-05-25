## Objectif

Publier 3 articles premium pour propulser le concept **Passeport Maison UNPRO = Carfax de l'habitation** + enrichir la section Passeport Maison existante (cartes d'entrée homepage + page `/proprietaires/passeport-maison`) avec le narratif "Trust Score / Contribution Maison".

## Livrables

### 1. Trois articles (table `blog_articles`, statut `published`)

Insertion via migration (seed SQL). Catégorie `passeport-maison` ajoutée dans le filtre du blog index.

| # | Slug | Titre | Angle | Audience |
|---|------|-------|-------|----------|
| 1 | `passeport-maison-carfax-habitation` | Pourquoi le Passeport Maison UNPRO va devenir aussi essentiel que le Carfax | Article fondateur : valeur démontrable, garanties, taxes, score maison | Propriétaires |
| 2 | `score-confiance-entrepreneur-unpro` | Le Score Confiance UNPRO : comment chaque preuve documentée augmente vos rendez-vous | Trust Score, +points par action, effet IA/matching | Entrepreneurs |
| 3 | `valeur-maison-historique-renovations-quebec` | Vendre plus cher : prouver vos rénovations avec un historique vivant | Comparaison 2 maisons, impact prix de vente, acheteurs rassurés | Propriétaires/vendeurs |

Chaque article :
- 1200-1800 mots, `content_markdown` riche (H2/H3, listes, tableau, citations)
- `meta_description`, `seo_title`, `faq_json` (3-5 Q/R), `schema_json` (Article + FAQPage), `tags`, `reading_time_minutes`, `word_count`
- `internal_linking_json` cross-link entre les 3 + vers `/proprietaires/passeport-maison`, `/pro`, `/journal`
- `cta_variant` adapté (homeowner vs contractor)
- `featured_image_url` : réutiliser visuels existants (pas de génération d'image)

### 2. Enrichissement page `/proprietaires/passeport-maison` (`PropertyGraphPage`)

Ajout d'un nouveau composant `SectionPasseportValueProps.tsx` injecté en haut :
- Bannière "Le Carfax de votre maison"
- 5 piliers : Prouver / Réduire risques / Garanties / Taxes / Score Maison (icônes lucide, glass cards)
- Bloc "Trust Score Contribution" expliquant le système de points premium (sans jamais dire "gamification" — termes : *Niveau Documentation*, *Indice Qualité UNPRO*)
- CTA double : "Ouvrir mon Passeport" + "Lire l'article fondateur" → article #1

### 3. Enrichissement `SectionPasseportCards` (homepage)

Ajustement copy carte "Passeport Maison" :
- desc : "Le Carfax de votre maison : historique, garanties, valeur"
- micro-tag "Nouveau" subtil
Aucun changement structurel.

### 4. Catégorie blog

Ajouter `{ key: "passeport-maison", label: "Passeport Maison" }` dans `CATEGORIES` de `BlogIndexPage.tsx`.

## Logique technique

- **Migration unique** `seed_passeport_maison_articles.sql` : 3 `INSERT INTO blog_articles` avec contenu markdown complet, FAQ JSON, schema JSON-LD, tags, `published_at = now()`, `status = 'published'`, `audience_type = 'public'`.
- Pas de nouvelles tables, pas de RLS à modifier (existant ok).
- Pas d'edge function nécessaire.
- Composants front en `glass-card` semantic tokens (respect design system Cinematic Dark).

## Contraintes

- Français Québec strict, ponctuation UNPRO (espaces, "V" de ville).
- Aucun terme "gamification", "points de gamer".
- Aucune mention "3 soumissions" en positif.
- Mobile-first, sémantique SEO (un seul H1 par article).
- Pas de génération d'images (réutilise visuels existants ou dégradés CSS).

## Succès

- 3 articles accessibles via `/blog/:slug` et listés sur `/blog?category=passeport-maison`.
- Page `/proprietaires/passeport-maison` enrichie avec le narratif Carfax + Trust Score.
- Cross-links fonctionnels article ↔ page Passeport ↔ homepage.
- JSON-LD Article + FAQ valide pour chaque article.

## Tâches

1. Migration SQL : seed des 3 articles complets
2. Créer `src/components/passeport/SectionPasseportValueProps.tsx`
3. Injecter le composant en haut de `PropertyGraphPage`
4. Mettre à jour copy `SectionPasseportCards`
5. Ajouter catégorie `passeport-maison` au `BlogIndexPage`

Confirme et je build d'un coup.