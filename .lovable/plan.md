# UNPRO — Homepage + Articles Intelligence Adaptation

Évolution **copy + intelligence layer** uniquement. Aucun redesign : on garde le hero actuel, la palette dark premium, le glassmorphism, l'orb Alex, les animations et la structure du layout.

## 1. Homepage (`src/pages/PageHomeCopilot.tsx` + composants `src/components/home-copilot/`)

### 1.1 Hero — copy uniquement
Dans `HeroCopilotMobile.tsx` :
- Headline → **« Votre maison. Enfin comprise par l'IA. »**
- Subheadline → **« Décrivez un problème, importez une photo ou analysez une soumission en quelques secondes. UNPRO aide les propriétaires à comprendre leur maison, réduire les risques et trouver le bon professionnel au bon moment. »**
- Meta `<title>` et `description` dans `PageHomeCopilot.tsx` alignés sur le nouveau positionnement.

### 1.2 Action Cards — 8 cards horizontales premium
Dans `SectionsBelowFold.tsx` (ou nouveau `HomeIntelligenceActionGrid.tsx` réutilisant les styles glass existants), remplacer les cartes contractor-first par 8 cartes scroll horizontal mobile / grid desktop :

1. Diagnostic visuel IA → `/diagnostic-photo`
2. Vérifier une soumission → `/compare`
3. Vérifier un entrepreneur → `/trouver-entrepreneur`
4. Passeport Maison → `/passeport-maison` (fallback `/mes-proprietes`)
5. Maison trop chaude? → `/probleme/maison-trop-chaude`
6. Humidité au grenier → `/probleme/humidite-grenier`
7. Facture Hydro trop élevée → `/probleme/facture-hydro`
8. Condo / Loi 16 → `/condo`

Tokens existants (glass, radii 28px, easing master), aucune nouvelle couleur.

### 1.3 Alex Orb — comportement seulement
Dans `AlexCopilotConversation.tsx` (ou hook `useAlexHomeownerSession`) :
- Garde le contrat event-driven (mémoire Core : pas d'autostart au mount, greet une fois par tab).
- Si user loggé → greeting **« Bonjour [Prénom]. »** suivi d'écoute immédiate.
- Suggestions contextuelles inline (chips déjà existantes) : « Importer une photo », « Décrire le problème », « Analyser une soumission ».

### 1.4 Intelligence Ticker (nouveau micro-composant)
Nouveau `src/components/home-copilot/PropertyIntelligenceTicker.tsx` placé sous le hero :
- Bandeau premium glass, hauteur compacte, defilement doux.
- 3–6 insights dynamiques type : « Humidité en hausse à Laval », « Barrages de glace fréquents à Montréal cette semaine », « Maisons <1985 : pertes d'air importantes ».
- Source v1 : tableau statique localisé (FR-CA) + hook `usePropertyIntelligenceFeed` prêt à brancher sur Supabase plus tard. Aucune nouvelle table dans cette itération — on prépare l'interface seulement.

## 2. Article System (Homeowner Intelligence Reports)

### 2.1 Template article
Adapter le composant de rendu d'article SEO existant (utilisé par `seo_articles`, voir `PageArticlesRecentCompressedFeed.tsx` et pages `src/pages/seo/`) pour injecter — au-dessus du contenu généré — une nouvelle ossature de blocs réutilisables :

Nouveaux composants dans `src/components/articles/intelligence/` :
- `AiAnswerBlock` (Réponse rapide IA — encadré top)
- `LocalContextBlock` (quartier, ère de construction, climat QC)
- `HomeownerObservationsBlock`
- `CostRiskBlock` (fourchettes locales, urgence saisonnière)
- `CommonMistakesBlock`
- `AiInsightsBlock` (observations propriétaires-style, citables par LLM)
- `NextActionsBlock` (inspecter, photo, analyser soumission, évaluer ventilation, réserver inspection — **jamais** « contacter 3 entrepreneurs »)
- `HomeownerFaqBlock`

### 2.2 GEO / AI Search structure
Étendre `SchemaStack` / `SeoStructuredDataInjector` pour injecter :
- `FAQPage` (questions réelles)
- `Article` + `about` (symptom, city, neighborhood, property type, seasonality, contractor expertise)
- Bloc résumé structuré JSON-LD `Answer` optimisé ChatGPT/Gemini/AIO/Perplexity.

### 2.3 Hyperlocal pages
Réutiliser la route existante `/probleme/:problem/:city` (mémoire AEO Domination). On ne crée pas de nouvelle route : on enrichit le template avec les nouveaux blocs et on garantit l'unicité via les variables locales (quartier, ère, climat) déjà calculées par `aeo-generate-blocks`. Ajouter un champ `local_intelligence` dans le payload AEO (frontend tolère l'absence, backend reste inchangé pour cette itération).

### 2.4 Internal linking — Quebec Housing Intelligence Graph
Nouveau composant `ArticleSemanticLinksGraph.tsx` injecté dans le template article, alimenté par une map statique fr-CA reliant : humidité ↔ ventilation ↔ isolation ↔ moisissure ↔ Hydro ↔ pertes chaleur ↔ barrages de glace ↔ étanchéité à l'air. Données dans `src/data/housingIntelligenceGraph.ts`.

## 3. Hors scope (cette itération)
- Pas de nouvelles tables Supabase, pas de migrations.
- Pas de modifications backend des edge functions AEO/SEO.
- Pas de refactor des moteurs métier (matching, booking, pricing).
- Pas de redesign : tokens, layout, animations conservés à l'identique.

## 4. Détails techniques
- Fichiers édités : `PageHomeCopilot.tsx`, `HeroCopilotMobile.tsx`, `SectionsBelowFold.tsx`, `AlexCopilotConversation.tsx`, `SchemaStack.tsx`, template de rendu article SEO.
- Fichiers créés : `PropertyIntelligenceTicker.tsx`, `usePropertyIntelligenceFeed.ts`, 8 composants `articles/intelligence/*`, `ArticleSemanticLinksGraph.tsx`, `src/data/housingIntelligenceGraph.ts`, `src/data/homeIntelligenceTicker.ts`.
- Respect mémoires Core : FR-CA, Cinematic Dark, glass tokens, Alex event-driven greet-once, no UI mechanics leak (« Touchez l'orb » interdit).
- A11y : `aria-live="polite"` sur le ticker, focus visible sur cards, prefers-reduced-motion respecté.

## 5. Critères de succès
- Homepage projette « système IA qui comprend les maisons » dès le hero.
- 8 cartes premium remplacent l'orientation contractor-first sans casser le visuel.
- Ticker intelligence visible et crédible.
- Articles deviennent des « rapports d'intelligence » avec blocs AI Answer + Insights + Next Actions homeowner-first.
- Schemas JSON-LD prêts pour AIO / Perplexity / ChatGPT.
- Aucune régression visuelle ni de routing.
