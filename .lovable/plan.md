## Plan — Nouvel article SEO/AEO

Ajouter un article statique premium au même standard que `PageBadgesConsommateur2026`.

### 1. Nouvelle page
`src/pages/articles/PageVerifierGrenierAvantFenetresThermopompe.tsx`
- Layout identique au pattern badges (hero, sections H2, signature pull-quote, CTA Alex)
- Wrapper sombre via `IntelligenceBackground` variant `default` pour cohérence visuelle
- Sections : Réponse rapide, Pourquoi c'est important, Où la chaleur s'échappe, Mythe des fenêtres, Hydro-Québec & RénoClimat, Thermopompe vs isolation, Signes d'alerte, Question simple, Observations terrain QC, Conclusion + pull-quote signature « Avant de changer ce que vous voyez… »
- CTA bouton ouvrant Alex via `useAlexVoice().openAlex` avec contexte « enveloppe du bâtiment / isolation entretoit »
- Liens internes vers `/pim` et `/diagnostic`

### 2. SEO / AEO
- `<Helmet>` :
  - title ≤60 : « Avant de remplacer fenêtres ou thermopompe : vérifiez le grenier »
  - meta description ≤160
  - canonical `https://unpro.ca/articles/verifier-grenier-avant-fenetres-thermopompe`
  - og:title / og:description / og:type=article
- JSON-LD :
  - `Article` (headline, datePublished, author UNPRO, publisher)
  - `FAQPage` (5 Q/R : Fenêtres ou isolation d'abord ? RénoClimat couvre-t-il l'isolation entretoit ? Combien coûte l'isolation d'un entretoit au QC ? Thermopompe sans isolation est-ce rentable ? Signes que mon grenier est mal isolé ?)
  - `BreadcrumbList` (Accueil › Articles › Article)

### 3. Routing
`src/app/router.tsx` :
- Lazy import
- Route `/articles/verifier-grenier-avant-fenetres-thermopompe`
  (avant la route catch-all `/articles/:slug`)

### 4. Sitemap
`public/sitemap.xml` (ou generator script si présent) : ajouter URL priority 0.7, changefreq monthly.

### 5. Hors scope
Pas de DB, pas de CMS, pas de nouvel asset image (placeholder gradient + IntelligenceBackground suffisent), pas de modif de l'article badges existant.