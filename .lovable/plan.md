## Objectif

Créer une landing page SEO premium dédiée au problème **pyrite / dalle de béton soulevée** au slug `/problemes/pyrite-sous-sol`, avec déclenchement Alex et CTA secondaire vers un expert pyrite. Mobile-first, dark cinematic, fr-CA.

## Fichiers à créer

1. **`src/pages/problemes/PagePyriteSousSol.tsx`** — page complète, autonome, basée sur les composants UI partagés existants (`PageHero`, `SectionHeading`, `CTAGroup`, `FAQSection`, `CTASection`, `SeoHead`, `SchemaStack`).

2. **Route** dans `src/app/router.tsx` :
   ```tsx
   <Route path="/problemes/pyrite-sous-sol" element={<PagePyriteSousSol />} />
   ```

3. **Sitemap** : ajouter l'URL dans `scripts/generate-ai-sitemap.ts` (entrée statique haute priorité 0.8).

## Structure de la page (sections)

```text
┌─ HERO (dark, glow rouge alerte douce)
│  H1: Pyrite dans le sous-sol? Ne rénovez pas avant de vérifier.
│  Sub: Dalle fissurée, soulevée ou réparée? Documentez avant d'agir.
│  CTA primaire: [Analyser mes photos avec Alex]  → openAlex("pyrite")
│  CTA secondaire: [Trouver un expert pyrite]     → /pros/expert-pyrite
│  Trust strip: "Sans engagement · Réponse en 60 sec · fr-CA"
│
├─ SECTION "Ce que UNPRO vérifie" (grid 3x3 icônes + libellés)
│  9 items: photos dalle, fissures, anciennes réparations, soulèvement,
│           humidité, historique réno, risque vice caché, test pyrite,
│           type de pro à consulter
│
├─ SECTION "Pourquoi agir rapidement" (alert card amber)
│  5 erreurs à éviter (liste avec X icons)
│
├─ SECTION "Professionnels recommandés" (4 cards)
│  Expert pyrite · Ingénieur · Entrepreneur spécialisé · Avocat vice caché
│  Chaque card → CTA "Voir disponibilité" → Alex avec contexte
│
├─ SECTION "Coûts possibles" (split: diagnostic vs correction majeure)
│  Diagnostic: quelques centaines $
│  Correction: démolition · excavation · remblai · dalle · drainage · finition
│  Punch line: "Diagnostiquer avant de rénover."
│
├─ SECTION "Commencez ici" (3 steps timeline)
│  1. Téléversez photos  2. Décrivez découverte  3. Alex analyse + recommande
│  CTA central: [Analyser mon sous-sol avec Alex]
│
├─ FAQ (5 items via FAQSection — déjà schema FAQPage ready)
│
└─ CTA FINAL (CTASection variant="accent")
   "Une découverte récente? Le temps compte."
   Primary: Alex · Secondary: Expert pyrite
```

## SEO

- **Title** : `Pyrite sous-sol Québec | Vérifier une dalle soulevée avant rénovation` (60 car ✓)
- **Description** : `Dalle fissurée, soulevée ou réparée? UNPRO vous aide à documenter le risque de pyrite, vice caché et travaux correctifs avant de rénover.` (160 car ✓)
- **Canonical** : `https://unpro.ca/problemes/pyrite-sous-sol`
- **hreflang** : fr-CA principal, x-default = fr
- **JSON-LD** via `SchemaStack` :
  - `WebPage` + `BreadcrumbList` (Accueil › Problèmes › Pyrite sous-sol)
  - `FAQPage` (5 Q/R)
  - `Service` (nom: "Diagnostic pyrite sous-sol", areaServed: QC)
- H1 unique, H2 par section, alt text descriptifs, lazy images.

## Intégration Alex

- CTA primaire et tertiaire : `openAlex("pyrite_basement")` via `useAlexVoice()` (contexte injecté pour préfill conversation).
- Le contexte `"pyrite_basement"` sera reconnu par le router d'intents Alex existant; sinon fallback `"general"` (à confirmer — si non reconnu, on log juste l'event et passe en general avec message d'amorce stocké dans `alexSessionState`).

## Design tokens

- Base `bg-background` (dark cinematic `#050816`)
- Glow d'alerte : `bg-amber-500/5` blur 80px sur section "Pourquoi agir rapidement"
- Cards : `glass` (`rgba(255,255,255,0.04)` + backdrop-blur 24px), radius 28px
- Boutons primary : radius 18px, hover `translateY(-2px)` easing `cubic-bezier(.22,1,.36,1)` 420ms
- Font : Inter, H1 tracking -0.04em
- Aucune couleur hardcodée → tokens uniquement

## Contraintes

- Pas de nouveaux composants partagés — réutiliser `PageHero`, `SectionHeading`, `CTAGroup`, `FAQSection`, `CTASection`, `SeoHead`, `SchemaStack`, `Button`, `Card`.
- Pas de backend / migration — page statique fr-CA.
- Pas de scroll-jacking, pas de modal d'entrée.
- Mobile-first (viewport 384px testé).

## Succès

- Route `/problemes/pyrite-sous-sol` rend la page sans erreur console
- CTA Alex ouvre l'orb avec contexte
- Lighthouse SEO ≥ 95, structured data valide
- Page incluse au prochain sitemap build

## Hors scope

- Pas de page `/pros/expert-pyrite` créée ici (CTA secondaire pointera vers la recherche de pros existante avec query `?specialite=pyrite` — fallback `/entrepreneurs?q=pyrite`).
- Pas de variantes par ville (à faire dans une phase 2 programmatique).
