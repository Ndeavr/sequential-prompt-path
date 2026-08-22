# Article — « Comment apparaître dans les résultats de recherche par l'IA en 2026? »

## Ce qui existe déjà (vérifié)

Le système éditorial UNPRO est hybride et je le réutilise tel quel :

- Pages éditoriales premium statiques dans `src/pages/articles/` (4 articles), route explicite dans `src/app/router.tsx`, plus une route générique `/articles/:slug` pour les articles de la table `seo_articles`.
- Composants partagés déjà en production : `SectionArticleStructuredData` (Article + BreadcrumbList + FAQPage), `SectionArticleFAQSEO`, `SectionArticleInternalLinksSEO`, `BlockArticleParagraphReadable`, `PanelArticleHighlightsClean`, `ButtonTalkToAlexArticle`, `BarArticleEngagementActions`.
- Hub `/articles` (`PageArticlesRecentCompressedFeed`) avec une liste `EDITORIALS` où chaque article statique est déclaré.
- Sitemap : `scripts/generate-sitemaps.ts`, tableau `PILLAR_ROUTES` → `public/sitemap-pages.xml`.
- Analytique CTA entrepreneur : table `entrepreneur_cta_events`, déjà utilisée par les articles existants.
- Routes entrepreneur réelles confirmées : `/entrepreneurs`, `/entrepreneur/onboarding`, `/entrepreneur/:slug/reclamer`, `/entrepreneur/devis-personnalise`, `/entrepreneur/garantie`, `/tarifs`, `/comment-fonctionne-ia`, `/pourquoi-pas-trois-soumissions`.

Aucune nouvelle table, aucun nouveau système SEO, aucune route concurrente ne sera créée.

## Ce qui sera construit

**1. La page article**
`src/pages/articles/PageApparaitreRechercheIA2026.tsx`, route `/articles/comment-apparaitre-resultats-recherche-ia-2026-entrepreneur`, conforme au patron des articles existants.

Contenu long-format français (fr-CA) couvrant les 20 sections demandées : introduction liens → réponses, SEO vs AEO vs GEO, pourquoi penser autrement en 2026, information structurée, comment UNPRO rend un entrepreneur compréhensible, spécialisation, services précis, territoire réel, client idéal, confiance numérique, disponibilité, « meilleur entrepreneur » → « meilleur entrepreneur pour ce client », rendez-vous exclusifs vs leads partagés, comment améliorer sa découvrabilité, exemple du petit entrepreneur sans département marketing, le profil comme identité numérique structurée, graphe de connaissances, futur de la recherche locale IA, appel à l'action Québec, FAQ complète.

Note : le texte intégral annoncé « juste avant cette requête » n'est pas présent dans ma fenêtre de conversation. Je rédige donc l'article complet à partir du plan en 20 sections, du positionnement UNPRO et des blocs de texte imposés dans la demande. Si vous préférez votre version mot pour mot, collez-la et je la substitue avant publication.

**2. Bloc réponse AEO**
Juste sous le H1 : le paragraphe de réponse condensé fourni, en HTML réel, extractible par un LLM.

**3. Garde-fou de véracité (obligatoire)**
Une section explicite : UNPRO ne peut pas garantir un classement dans ChatGPT, Gemini ou Google. UNPRO structure l'intelligence entrepreneur et améliore la découvrabilité et le pairage dans son propre écosystème. Vocabulaire imposé : « améliorer la compréhension », « augmenter la découvrabilité », « mieux structurer », « faciliter la recommandation ». Aucune note, aucun avis, aucune statistique, aucun prix, aucune certification inventés.

**4. Conversion**
- CTA contextuel vers 40 % de l'article : « Est-ce que l'IA comprend vraiment votre entreprise? » → « Créer ou réclamer mon profil » → `/entrepreneur/onboarding`.
- CTA final : primaire « Créer mon profil UNPRO » → `/entrepreneur/onboarding`; secondaire « Découvrir UNPRO pour entrepreneurs » → `/entrepreneurs`.

**5. Données structurées**
Réutilisation de `SectionArticleStructuredData` : Article (headline, description, datePublished, dateModified, author « Équipe UNPRO », publisher UNPRO canonique, mainEntityOfPage, image, inLanguage `fr-CA`), BreadcrumbList, FAQPage. Aucune duplication d'Organization ou de LocalBusiness déjà globales.

**6. Métadonnées et social**
`<Helmet>` : title, meta description, canonical auto-référentiel `https://unpro.ca/articles/comment-apparaitre-resultats-recherche-ia-2026-entrepreneur`, `og:type=article`, og:title/description/image, `twitter:card=summary_large_image`, `lang`/`inLanguage` fr-CA.
Image OG et héros : `src/assets/articles/apparaitre-recherche-ia-2026.jpg`, générée selon la charte UNPRO (entrepreneur québécois au premier plan, interface d'intelligence abstraite qui converge vers une seule recommandation, surtitre « ÊTRE TROUVÉ PAR L'IA EN 2026 », sous-titre « Le nouveau référencement des entrepreneurs »). Aucune imitation d'interface Google, ChatGPT ou Gemini.

**7. Découverte interne**
- Entrée en tête de la liste `EDITORIALS` du hub `/articles`.
- Route ajoutée à `PILLAR_ROUTES` dans `scripts/generate-sitemaps.ts`, puis régénération de `public/sitemap-pages.xml`.
- Liens internes sortants uniquement vers des routes vérifiées ci-dessus, plus les deux articles connexes existants (« Moins de soumissions, plus de factures », article fournisseur de peinture).
- Liens entrants ajoutés depuis les deux articles connexes vers celui-ci.

**8. Analytique**
Réutilisation de `entrepreneur_cta_events` : `article_ia2026_view`, `article_ia2026_scroll_50`, `article_ia2026_scroll_90`, `article_ia2026_profile_cta`, `article_ia2026_pricing_click`. Aucun second système d'analytique.

**9. UX**
Largeur de lecture confortable, un seul H1, hiérarchie H2/H3 stricte, table des matières ancrée, temps de lecture, encadrés sobres, typographie premium existante. Mobile : aucun débordement horizontal, titres calibrés, CTA accessible, aucun élément collant qui masque le texte. Aucun texte critique rendu uniquement par animation ou canvas.

## Détails techniques

- Fichiers créés : la page article et l'image héros/OG.
- Fichiers modifiés : `src/app/router.tsx` (une route), `PageArticlesRecentCompressedFeed.tsx` (une entrée), `scripts/generate-sitemaps.ts` + `public/sitemap-pages.xml`, et deux articles existants pour les liens entrants.
- Base de données : aucune migration. `seo_articles` n'est pas utilisée pour les éditoriaux statiques; RLS inchangée.
- `public/robots.txt` : inspection uniquement, pour confirmer que la route n'est pas bloquée. Aucun assouplissement des restrictions de sécurité existantes.

## Vérification avant de déclarer terminé

Test navigateur réel sur la route : statut 200, un seul H1, canonical auto-référentiel, absence de noindex, JSON-LD Article/FAQPage/BreadcrumbList parsés sans erreur, métadonnées OG présentes, chaque lien interne résolu en 200, les deux CTA atteignent le vrai parcours entrepreneur, rendu mobile 390 px sans débordement, aucune erreur console, aucune image brisée, événements analytiques écrits, présence dans le sitemap, et relecture finale contre toute affirmation non vérifiable.

Rapport final : URL de production, canonical, titre, schémas, liens internes, destination des CTA, état du sitemap, état OG, tests effectués, blocages externes restants.
