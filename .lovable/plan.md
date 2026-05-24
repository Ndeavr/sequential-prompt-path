## Problèmes constatés sur `/ai-indexed-profiles/isolation-solution-royal`

D'après les captures :
1. **Textes invisibles** — les H1/H2 ("Isolation Solution Royal", "Analyse AIPP", "Questions fréquentes", titres de services, scores `70/100`...) s'affichent en quasi-noir sur fond quasi-noir. La classe `landing-warm` ne s'applique pas correctement et le thème sombre global "bleed through". Les `text-stone-900` deviennent illisibles.
2. **RBQ non vérifiée** — actuellement la validation RBQ est seulement marquée `not_found` au seed, jamais croisée avec le registre RBQ.
3. **Bouton "Demander un rendez-vous"** — aucun `onClick`, ne fait rien.
4. **Logo absent** — `logo_url` vide en BDD, jamais hydraté lors du scrape.

---

## Phase 1 — Corrections immédiates (UI + CTA + Logo)

### A. Lisibilité / Theme
- Forcer un fond **warm neutral réel** sur `PageAiIndexedProfile` via wrapper `style={{ background: '#F7F6F0', color: '#1c1917' }}` au lieu de dépendre de `.landing-warm` (qui peut être surchargé par un parent dark).
- Ajouter `data-theme="warm"` sur le root + un `<style>` scoped qui force `color-scheme: light` et override les tokens `--background`, `--foreground`, `--card`, `--muted-foreground` pour cette page uniquement.
- Remplacer `text-stone-900` par `text-[#1c1917]` explicite sur H1/H2 et `text-stone-600` par `text-[#57534e]` pour les sous-titres.
- Score breakdown : les chiffres `70/100` rendent avec `text-stone-300` (trop pâle). Passer en `text-stone-900 font-bold` pour le nombre, `text-stone-500` uniquement pour `/100`.

### B. CTA "Demander un rendez-vous"
- Wire les 3 boutons hero :
  - **Demander un rendez-vous** → `navigate('/rendez-vous?contractor=${slug}&trade=${primary_trade}&city=${primary_city}')`
  - **Vérifier cette entreprise** → `navigate('/verification?company=${company_name}')`
  - **Analyser mes soumissions** → `navigate('/analyser-soumission?context=${slug}')`
- Tracker l'événement (`trackFunnelEvent('aipp_cta_click', { slug, cta })`) avant navigation.

### C. Logo
- Étendre la edge function `aipp-import-website` pour extraire le logo via Firecrawl format `branding` (déjà supporté). Champs récupérés : `branding.images.logo`, `branding.images.favicon`.
- Stocker dans `aipp_profiles.logo_url` lors du `persist`.
- Seed manuellement `logo_url` pour `isolation-solution-royal` à partir de `isroyal.ca` (re-run import en mode persist, ou UPDATE direct via tool insert).
- Fallback hero si pas de logo : afficher la première initiale dans un cercle warm `bg-stone-900 text-amber-50`.

---

## Phase 2 — Vérification RBQ réelle

### Nouvelle edge function `aipp-verify-rbq`
- Input : `{ profile_id, company_name, neq?, address_city? }`
- Logique :
  1. Scrape `https://www.rbq.gouv.qc.ca/recherche-titulaires` via Firecrawl `scrape` + format `json` avec prompt structuré (nom commercial + ville).
  2. Si match unique trouvé → écrire `aipp_profile_validations.rbq_number`, `rbq_status='confirmed'`, `rbq_categories[]`, `rbq_valid_until`.
  3. Si plusieurs candidats → `rbq_status='unverified'` + stocker `rbq_candidates` (jsonb).
  4. Si aucun → `rbq_status='not_found'`.
  5. Logger source dans `aipp_profile_sources` (`source_type='rbq_registry'`, `source_url`, `fetched_at`).
- Idem pattern pour **NEQ** via Registraire des entreprises (`registreentreprises.gouv.qc.ca`) — fonction `aipp-verify-neq`.

### UI admin
- Sur `/admin/aipp-profiles`, ajouter bouton **"Vérifier RBQ + NEQ"** par profil qui invoque les deux edge functions en parallèle puis re-fetch.
- Sur la page publique, afficher si `confirmed` : numéro RBQ + lien direct `https://www1.rbq.gouv.qc.ca/...?numLicence=XXXX` comme **source vérifiable**.

### Migration mineure
- Ajouter colonnes à `aipp_profile_validations` si manquantes :
  - `rbq_candidates jsonb`
  - `rbq_valid_until date`
  - `rbq_categories text[]`
  - `neq_candidates jsonb`
  - `rbq_verified_at timestamptz`
  - `neq_verified_at timestamptz`

---

## Out of scope (phases suivantes)
- Vérification assurance (pas de registre public consolidable)
- Auto-recheck cron mensuel RBQ/NEQ
- Affichage des sources cliquables dans une drawer "Comment c'est vérifié"

---

## Question pour confirmation

Je propose de livrer **Phase 1 maintenant** (lisibilité + 3 CTA + logo via re-scrape branding + seed `isolation-solution-royal`) pour débloquer visuellement, puis Phase 2 (RBQ/NEQ réelles) dans un second tour.

Confirmes-tu cet ordre, ou tu veux que je fasse tout (Phase 1 + Phase 2) en un seul build ?
