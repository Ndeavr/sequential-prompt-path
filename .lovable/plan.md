## /radon — Landing Page UNPRO

Nouvelle page publique premium française, intégrée au système UNPRO (Alex, Passeport Maison, matching pro). Mobile-first, dark cinematic theme conforme au design system.

### 1. Route & fichier
- Nouvelle route `/radon` enregistrée dans `src/app/router.tsx`
- Page : `src/pages/PageRadonLanding.tsx`
- SEO via `SeoHead` (title, description, canonical `https://unpro.ca/radon`, JSON-LD `Service` + `FAQPage`)

### 2. Structure (sections)

**Hero**
- H1 : « Radon dans votre maison? Faites mesurer, comprendre et corriger sans deviner. »
- Sous-titre avec la ligne directrice 200 Bq/m³ (Santé Canada)
- CTA primaire : **Vérifier mon risque avec Alex** → ouvre `useAlexVoice().openAlex("radon")` avec contexte `{ topic: "radon" }`
- CTA secondaire : **Réserver un test radon** → `/onboarding?intent=radon_test&utm_source=radon_landing`
- Microcopy en 4 puces (Résultat clair · Entrepreneur qualifié · Passeport Maison · Québec seulement)

**Pourquoi agir** — bloc explicatif court, icônes (sous-sol, vide sanitaire, étanchéité)

**Ce que UNPRO fait** — 5 puces (comprendre, réserver, comparer, recommander, archiver)

**Offres** — 3 cartes `glass-card` :
1. Test radon résidentiel → `/onboarding?intent=radon_test`
2. Analyse de rapport existant → `/onboarding?intent=radon_report_analysis` (upload pris en charge par flow Alex existant)
3. Correction / mitigation → `/onboarding?intent=radon_mitigation`

**Flow Alex (aperçu visuel)** — Timeline 5 étapes (propriété, sous-sol, année construction, test existant, tester/corriger). Visuel uniquement ; les questions réelles sont posées par Alex via le contexte `radon` (pas de nouveau formulaire).

**Bloc confiance** — texte rassurance + icônes (fondation, ventilation, fissures, drain)

**FAQ** — 4-5 questions (Qu'est-ce que le radon? · Quel est le seuil au Canada? · Combien coûte un test? · Que faire si élevé? · Couverture Québec) — alimente JSON-LD FAQPage

**CTA final** — pleine largeur, fond accent, bouton « Parlez à Alex maintenant » avec phrase suggérée « Je veux vérifier le radon dans ma maison. »

### 3. Intégration Alex
- Ajouter une entrée `radon` dans `src/config/alexModes.ts` (greeting + 5 questions ci-dessus + intent capturé)
- `openAlex("radon")` injecte le contexte initial. Pas d'auto-start (respect règle event-driven).

### 4. Visuels
- Hero : illustration générée (capteur radon stylisé sur fond sous-sol, dark cinematic) → `src/assets/radon-hero.jpg`
- Icônes lucide : `Wind`, `Home`, `ShieldCheck`, `FileSearch`, `Wrench`

### 5. Tracking
- `trackFunnelEvent("radon_landing_view")` au mount
- `radon_cta_alex`, `radon_cta_book`, `radon_offer_click` (avec offre)

### 6. Composants réutilisés (zéro duplication)
- `PageHero`, `SectionContainer`, `SectionHeading`, `CTASection`, `Card`, `SeoHead`, `SeoFaqSection`
- Layout public via `MainLayout` (warm? non — page produit, garde Cinematic Dark base + `landing-warm` classe NON appliquée — cohérent avec autres landings produits sous app/.)

### 7. Hors périmètre
- Pas de table SQL nouvelle (le flow utilise `user_sessions` + Alex existants)
- Pas de logique de matching pro nouvelle (réutilise pipeline existant via intent `radon_mitigation`)
- Pas de page `/r/:shortCode` ni QR — feature séparée déjà livrée

### 8. Critères de succès
- Page accessible à `/radon`, indexable (canonical + JSON-LD)
- Mobile 384px : aucun overflow, CTA full-width, sections espacées
- CTA Alex ouvre l'overlay vocal en français, contexte radon chargé
- CTA secondaires redirigent vers onboarding avec bons UTM/intents
- FAQ rendue + structured data validée
