# Publier l'article "Et si votre maison pouvait prévoir les réparations avant qu'elles ne deviennent des urgences ?"

## Objectif
Créer un nouvel article publié dans `/blog/:slug`, sans toucher au design ni au code des pages — uniquement une insertion de contenu dans la table existante `blog_articles`.

## Slug et metadata
- **slug** : `maison-prevoir-reparations-avant-urgences`
- **URL finale** : `https://unpro.ca/blog/maison-prevoir-reparations-avant-urgences`
- **category** : `guides-renovation`
- **audience_type** : `public`
- **city** : `null` (article national)
- **status** : `published`, `published_at = now()`
- **author_name** : `UNPRO`
- **reading_time_minutes** : ~8
- **tags** : `["intelligence résidentielle","prévention","entretien","IA","rénovation"]`
- **seo_title** : « Prévoir les réparations de votre maison grâce à l'IA | UNPRO »
- **meta_description** : « L'intelligence résidentielle permet d'anticiper les problèmes, prioriser les rénovations et éviter les urgences coûteuses. Voici comment UNPRO change la donne. »

## Contenu
Le texte fourni par l'utilisateur est inséré tel quel dans `content_markdown` (titres `##`, sous-listes `-`), avec :
- H1 = `title` (rendu par la page article)
- Sous-titre = `subtitle` : « Comment l'intelligence résidentielle remplace la réaction par la prévision. »
- Section « Réponse rapide » conservée comme premier bloc.
- `faq_json` : 4 FAQ extraites du texte (cycle de vie, IA vs 3 soumissions, ROI préventif, intelligence résidentielle).
- `schema_json` : `Article` schema.org minimal (headline, datePublished, author UNPRO, inLanguage `fr-CA`).
- `internal_linking_json` : liens vers `/ia-maison`, `/pourquoi-unpro`, `/blog/3-soumissions-cout-cache`, `/diagnostic`.

## Livrable technique
Une seule migration SQL : `INSERT INTO public.blog_articles (...) VALUES (...)` avec `ON CONFLICT (slug) DO UPDATE` pour rester idempotent.

## Hors scope
- Aucun changement à `BlogArticlePage.tsx`, au routing, au design, à Alex, ni aux autres variantes home A/B/C.
- Aucune image générée (utilise `featured_image_url = null`, fallback de la page).
- Aucune RLS / GRANT modifié (déjà en place).

## Critère de succès
`/blog/maison-prevoir-reparations-avant-urgences` rend l'article complet, listé dans `/blog` sous « Guides rénovation », sans régression.
