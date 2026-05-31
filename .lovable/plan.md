## Objectif

Créer `unpro.ca/isolation-solution-royal` — page partenaire **Signature** dédiée à *Isolation Solution Royal* (isroyal.ca), enrichie par scraping en temps réel, avec prise de rendez-vous directe synchronisée à l'agenda du partenaire.

## Approche en 3 couches

### 1. Couche données — Scraping & enrichissement (`isroyal.ca`)

Edge function `partner-scrape-enrich` (Firecrawl + Lovable AI Gateway / `google/gemini-3-flash-preview`) :
- **Firecrawl scrape** d'isroyal.ca (`formats: ['markdown', 'links', 'screenshot', 'branding']`) + crawl léger (`limit: 15`, `maxDepth: 2`) pour pages Services / À propos / Contact / Réalisations.
- **Extraction structurée** (Gemini + schema JSON) :
  - identité (nom légal, slogan, années d'expérience, fondateurs)
  - services (isolation uréthane, cellulose, fibre de verre, insonorisation, etc.)
  - zones desservies (Laurentides, Lanaudière, Grand Montréal…)
  - certifications / RBQ / APCHQ / Écohabitation
  - témoignages, projets, garanties
  - coordonnées (tél, email, adresse)
- **Branding** : couleurs, logo, screenshots hero → stockés dans `storage` bucket `partners/isolation-solution-royal/`.
- **Persistence** : table `signature_partners` (1 ligne par slug) avec `scraped_data jsonb`, `enriched_at`, `source_url`, `brand jsonb`, `services jsonb`, `coverage jsonb`, `media jsonb`.
- **Cache** : refresh hebdomadaire via cron (`pg_cron` ou bouton admin "Re-scrape").

### 2. Couche présentation — Page Signature

Route publique `/isolation-solution-royal` (slug propre, pas sous `/contractor/`) — composant `PageSignaturePartner` paramétré, premier client = Isolation Solution Royal.

**Sections (mobile-first, premium dark + warm accents façon Memory `premium-cinematic-theme`)** :
1. **Hero Signature** — logo, nom, badge "Partenaire Signature ⚜️", note moyenne, années d'expérience, CTA "Réserver maintenant".
2. **Trust Strip** — RBQ vérifié, assurances, AIPP score live, badge UNPRO Signature.
3. **Services & spécialités** — cards générées depuis scraping (uréthane giclé, cellulose, etc.) avec prix indicatifs si dispo.
4. **Zones desservies** — carte/chips des villes couvertes.
5. **Avis vérifiés** — pull depuis Google Reviews (via edge `verify-reviews-analysis` existante) + témoignages scrapés.
6. **Galerie projets** — photos `Avant/Après` depuis scraping ou placeholders.
7. **Garanties & certifications** — badges (RBQ, APCHQ, Écohabitation, garantie 10 ans…).
8. **Prise de rendez-vous inline** — `SignaturePartnerBookingWidget` (voir §3).
9. **Section "Pourquoi Signature ?"** — différenciation UNPRO (concierge décisif, 1 reco, pas de 3 soumissions).
10. **FAQ + JSON-LD** (`LocalBusiness`, `Service`, `FAQPage`, `BreadcrumbList`, `AggregateRating`).
11. **Sticky footer mobile** — "Réserver une visite" → ouvre widget.

**SEO** : `SeoHead` avec title `Isolation Solution Royal — Partenaire Signature UNPRO`, canonical `https://unpro.ca/isolation-solution-royal`, OG image générée depuis screenshot hero.

### 3. Couche booking — Sync agenda

- Table `partner_calendar_availability` : `partner_id`, `date`, `slots jsonb[]` (heures dispo), `synced_at`, `source` (`manual` | `google` | `outlook` | `ical`).
- Edge `partner-calendar-sync` : pull ICS public si fourni, sinon admin saisit slots via `/admin/partners/isolation-solution-royal/calendar`.
- Widget client `SignaturePartnerBookingWidget` :
  - Étape 1 : type de besoin (uréthane, cellulose, entretoit, insonorisation, autre)
  - Étape 2 : code postal + type de propriété
  - Étape 3 : date/heure depuis `partner_calendar_availability`
  - Étape 4 : coordonnées (ou auto-fill via `useUserMemory`)
  - Submit → table `partner_bookings` + notification (Resend) au partenaire + confirmation client.
- **Pas de "3 soumissions"** — un seul partenaire recommandé, conforme manifesto.

## Schéma DB (migration)

```sql
CREATE TABLE public.signature_partners (
  id uuid PK default gen_random_uuid(),
  slug text unique not null,           -- 'isolation-solution-royal'
  legal_name text, display_name text,
  source_url text,                     -- 'https://isroyal.ca'
  brand jsonb,                          -- colors, logo, fonts
  services jsonb,                       -- array
  coverage jsonb,                       -- cities/regions
  certifications jsonb,
  media jsonb,                          -- screenshots, gallery
  reviews_summary jsonb,
  scraped_data jsonb,                   -- raw firecrawl payload
  enriched_at timestamptz,
  is_active boolean default true,
  tier text default 'signature',
  created_at, updated_at
);

CREATE TABLE public.partner_calendar_availability (
  id uuid PK, partner_id uuid FK,
  date date, slots jsonb, source text,
  synced_at timestamptz, unique(partner_id, date)
);

CREATE TABLE public.partner_bookings (
  id uuid PK, partner_id uuid FK,
  service_type text, postal_code text, property_type text,
  scheduled_at timestamptz, contact jsonb,
  status text default 'pending',
  user_id uuid null, created_at
);
```

Avec `GRANT SELECT` à `anon` sur `signature_partners` + `partner_calendar_availability` (lecture publique), `GRANT INSERT` à `anon` sur `partner_bookings` (avec RLS limitant l'insert au format attendu), `GRANT ALL service_role`.

## Détails techniques

- **Firecrawl** : connecteur existant à vérifier (`fetch_secrets` → `FIRECRAWL_API_KEY`). Si absent, je demanderai la clé.
- **Voice / Alex** : bouton "Parler à Alex de ce partenaire" → préremplit le contexte avec le slug.
- **Admin** : page `/admin/partners` liste signature_partners + bouton "Re-scrape" + éditeur slots.
- **Tests** : jeu de données scrapé inséré une fois en seed pour rendre la page utilisable même hors-ligne.

## Fichiers à créer / modifier

**Créer**
- `supabase/migrations/<ts>_signature_partners.sql`
- `supabase/functions/partner-scrape-enrich/index.ts`
- `supabase/functions/partner-calendar-sync/index.ts`
- `supabase/functions/partner-booking-submit/index.ts`
- `src/pages/partners/PageSignaturePartner.tsx`
- `src/features/partners/components/HeroSignaturePartner.tsx`
- `src/features/partners/components/PartnerServicesGrid.tsx`
- `src/features/partners/components/PartnerCoverageMap.tsx`
- `src/features/partners/components/PartnerReviewsBlock.tsx`
- `src/features/partners/components/PartnerGallery.tsx`
- `src/features/partners/components/SignaturePartnerBookingWidget.tsx`
- `src/features/partners/hooks/useSignaturePartner.ts`
- `src/features/partners/services/partnerService.ts`
- `src/pages/admin/partners/PageAdminPartners.tsx`

**Modifier**
- `src/app/router.tsx` — route `/isolation-solution-royal` + `/admin/partners`
- `src/config/routesConfig.ts` — constantes
- `mem://index.md` — ajouter reference memory `signature-partners-system`

## Hors scope (à reporter)

- Sync OAuth Google/Outlook calendar bidirectionnelle complète (Phase 2)
- Paiement de dépôt au booking (Phase 2)
- Multi-tenant : généralisation aux autres Signature partenaires (le composant est déjà paramétré, il suffira d'ajouter des slugs en DB)
