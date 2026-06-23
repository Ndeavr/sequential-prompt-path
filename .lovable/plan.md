# Plan — Article "Bassin inondé 2 fois en 2 ans : ai-je besoin d'un drain français ?" + Alex contextuel

## 1. Objectif
Publier un nouvel article Housing Intelligence (FR-CA) basé sur le contenu fourni, avec un CTA "Parler à Alex" qui ouvre Alex **avec contexte + intent pré-chargés** (sujet : infiltration sous-sol / drain français), pour convertir le lecteur en conversation qualifiée.

## 2. Livrables

### A. Article
- **Route** : `/journal/drain-francais-sous-sol-inonde-deux-fois` (s'aligne sur Intelligence Journal existant)
- **Source** : nouveau fichier MDX/TS dans `src/data/journal/` (à confirmer après lecture du registre existant) avec :
  - Titre FR-CA traduit du contenu fourni
  - Executive Answer, La Question, L'erreur la plus fréquente, Pourquoi les maisons QC inondent, sections 1-5 (toiture, pente, pompe puisard, drain français, fissures), Clapet antiretour, Ordre de priorité, Insight UNPRO, FAQ, "Comment UNPRO analyserait ça"
  - Métadonnées SEO (title <60, meta <160), JSON-LD `Article` + `FAQPage`, OG image
  - Reading time, catégorie "Infiltration & Fondation", publishedAt
- **Composants réutilisés** : `ArticleCard`, `FAQSection`, `SeoHead`, `SchemaStack`, `SeoInternalLinks`
- **Liens internes** : pages problèmes/services existantes (`/probleme/infiltration-eau/:ville`, `/services/drain-francais/:ville`, guide fondation)

### B. CTA Alex contextuel (bloc inline + sticky bas)
- Bouton `Parler à Alex de mon sous-sol` qui appelle :
  ```ts
  openAlex("article_french_drain", {
    intent: "diagnose_basement_flooding",
    context: {
      source: "journal",
      article_slug: "drain-francais-sous-sol-inonde-deux-fois",
      topic: "infiltration_sous_sol",
      symptoms: ["inondation_repetee", "eau_stagnante"],
      property_hint: "bungalow_avant_1970",
      suggested_first_question: "Avez-vous un drain français ou une pompe de puisard installés ?"
    }
  })
  ```
- Alex ouvre directement sur sa première question contextuelle au lieu du greeting générique — court-circuite la phase découverte.

### C. Plomberie technique
- Étendre la signature `openAlex` dans `src/contexts/AlexVoiceContext.tsx` pour accepter un 2ᵉ paramètre `{ intent, context }` (rétro-compatible : optionnel).
- Stocker le contexte dans `alexSessionState` → consommé par le prompt builder Alex (kernel) comme "primer" système avant la 1ʳᵉ question.
- Le kernel utilise `context.suggested_first_question` comme ouverture si présent, sinon greeting standard.

### D. Indexation
- Ajouter l'entrée dans `public/sitemap-journal.xml` + `public/llms-full.txt` (extrait Executive Answer).
- Mettre à jour `src/data/mockBlogPosts.ts` ou data source équivalente du journal.

## 3. Hors scope
- Pas de modification du kernel Alex au-delà du primer (pas de changement de voix/persona).
- Pas de nouvelle table Supabase — contexte passé en mémoire de session.
- Pas de génération d'image hero (utilisera placeholder gradient existant comme les autres articles).

## 4. Critères de succès
- Article live à `/journal/drain-francais-sous-sol-inonde-deux-fois` en FR-CA
- JSON-LD Article + FAQPage validés
- CTA "Parler à Alex" ouvre Alex qui démarre par une question ciblée sur drain français/puisard (pas le greeting générique)
- Article indexé dans sitemap + llms-full
- Aucune régression sur les autres déclencheurs `openAlex`
