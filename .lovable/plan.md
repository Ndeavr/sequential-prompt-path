## UNPRO — Claim-First Contractor Funnel (Week 1)

Transform contractor acquisition from "signup → learn → pay" into "see your pre-built profile → claim for $1 → activate". Kill 7 of 10 friction points.

---

### 1. Pre-Built Contractor Profile Pages (the new front door)

**Route**: `/entrepreneur/:slug` (e.g. `/entrepreneur/toiture-tremblay-montreal`)

Server-rendered, **unauthenticated**, pre-populated from scrape data. No login wall.

**Hero block**:
- Logo + business name + RBQ + cities
- Three score rings: **Google Visibility**, **AI Visibility (AIPP)**, **Trust Score**
- Live counter: "X homeowners cherchent ce service à {city} ce mois"
- Primary CTA: **"C'est mon entreprise — Réclamer"**

**Snapshot block** (below hero, visible immediately, no scroll required on mobile):
- Identity: Nom, RBQ, NEQ, Catégories, Villes
- Reputation: Google reviews count + avg, années actives, site web
- Missing signals (red chips): "Pas de photos", "Pas de licence vérifiée", "Pas de description"
- Each missing signal = -X points on visibility (visible math)

**Projection block** (the hook):
- "UNPRO estime **174 demandes/an** dans votre zone"
- "**23 actuellement non assignées**"
- Sub-CTA: "Voir mon potentiel de revenus →"

---

### 2. Claim Flow (4 screens, ≤60 seconds, no account first)

```
Screen 1: Confirm  →  Screen 2: Volume  →  Screen 3: Ticket  →  Screen 4: Projection + $1 Activation
```

**S1 — Confirmer l'entreprise**  
Single tap: "✓ C'est mon entreprise" / "Ce n'est pas moi"

**S2 — Combien de jobs/mois ?**  
Pills: 5 / 10 / 25 / 50+

**S3 — Valeur moyenne projet ?**  
Pills: <2k / 2-5k / 5-10k / 10k+

**S4 — Projection personnalisée**  
- "Rendez-vous potentiels: **24-78/an**"
- "Revenus potentiels: **48 000 $ – 350 000 $**"
- Founding Member box: **1 $ d'activation**
- ✓ Profil vérifié ✓ Visibilité IA ✓ Matching propriétaires ✓ Rendez-vous exclusifs
- CTA: **"Activer mon profil — 1 $"**

**Account creation happens DURING Stripe checkout** (email auto-passed, magic-link post-payment). No signup form before payment.

---

### 3. Outreach Rewrite

SMS/email templates rewritten away from "Join UNPRO" toward curiosity:

```
Danny,
On a analysé Toiture Tremblay.
• 174 demandes/an estimées dans votre zone
• 23 non assignées actuellement
• Score visibilité IA: 63/100
Votre profil: unpro.ca/entrepreneur/toiture-tremblay
```

Every outbound link → pre-built profile page (never homepage, never `/join`).

---

### 4. Post-Payment Success → Gamification

After $1 activation:

**Welcome screen** (replaces generic "Payment successful"):
- "Bienvenue. Votre profil est en ligne."
- Current visibility: **63/100** (animated ring)
- First match estimate: **3–12 jours**
- **Améliorez votre score** (checklist, each +pts):
  - ☐ Ajouter assurance (+8)
  - ☐ Ajouter photos projets (+12)
  - ☐ Vérifier licences (+10)
  - ☐ Connecter Google (+15)
- Plan selection deferred — appears as upsell **after first match** or when score hits 80.

---

### 5. Data: Contractor Intelligence Profile

Single canonical table consolidating scrape outputs into the three score families used everywhere (profile page, projection, score reveal):

- **Identity**: business_name, rbq, neq, categories[], cities[]
- **Reputation**: google_review_count, google_rating, years_active, website_url
- **Signals** (missing_*): website, photos, descriptions, licenses, review_velocity
- **Match Potential**: service_demand_score, region_demand_score, competition_score, est_annual_appointments, est_unmatched

Computed once on scrape, refreshed on claim, displayed on profile.

---

### Technical Notes

- Profile page: public route, no auth, SSR-friendly meta tags for SMS link previews + AEO/SEO.
- Slug generation: `{business-name}-{city}` normalized, unique constraint, stored on scrape.
- Claim flow state: sessionStorage until payment; on Stripe success webhook → create `auth.users` from email, attach `contractor_id`, send magic link.
- $1 activation = Stripe one-time payment, not subscription. Plan upsell is a separate later flow.
- Reuse existing tables where they already model these fields (e.g. `contractor_entities`, `aipp_*`, `outbound_*`) rather than duplicating. Audit + migration before building new ones.
- Pre-built profile pages double as SEO/AEO targets (already aligned with `mem://features/seo-index-domination` and `mem://features/truth-layer-llm-citation`).

---

### Build Order (Week 1)

1. **Audit** existing tables/routes that already cover scrape data, slugs, AIPP scoring, and outbound links — confirm what to reuse vs. create.
2. **Public route** `/entrepreneur/:slug` with Hero + Snapshot + Projection blocks (mock data first, wired to real data second).
3. **Claim flow** 4-screen wizard (no auth) → Stripe $1 checkout with email capture.
4. **Stripe webhook** → account creation + magic link + contractor link.
5. **Success/gamification screen** with score checklist.
6. **Outreach templates** rewritten + linked to `/entrepreneur/:slug`.
7. **Kill** signup-first entry points: redirect `/entrepreneur/join` → nearest matched profile page or generic discovery if unknown.

---

### Out of Scope (explicitly)

- Plan selection UI changes (deferred to post-activation upsell).
- New scraping sources (current GMB + RBQ + NEQ + website + reviews is enough).
- Contractor dashboard refactor (only the success/checklist screen changes).
- Homeowner-side flows.

---

### Questions Before Build

1. **Confirm $1 activation model** — replaces or coexists with current Recrue/Pro/Premium/Élite/Signature plans? (Plan upsell after first match? After 14 days? Hard paywall at match #2?)
2. **Slug source of truth** — generate fresh on scrape, or reuse an existing slug field from `contractor_entities` / outreach tables?
3. **Should the profile page be publicly indexable by Google** (SEO win) or `noindex` until claimed (avoids exposing unclaimed pros)?