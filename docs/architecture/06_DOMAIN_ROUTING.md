# UNPRO — Domain & Routing Architecture

> Stratégie DNS, routing, et SEO pour domination AEO/GEO.

_Last updated: 2026-04-11_

---

## 1. Architecture DNS Finale

| Domaine | Rôle | Stack | Priorité |
|---------|------|-------|----------|
| `unpro.ca` | **SEO Engine** — toutes pages indexables | Lovable (React/Vite) | 🔴 Critique |
| `app.unpro.ca` | **SaaS Platform** — dashboard, booking, paiement | Lovable (React/Vite) | 🔴 Critique |
| `api.unpro.ca` | **Backend API** — Edge Functions, agents IA | Supabase Edge Functions | 🟡 Phase 2 |
| `cdn.unpro.ca` | **Assets** — images, documents, avant/après | Supabase Storage + CDN | 🟢 Optionnel |

### Règle Critique SEO

> **TOUT le contenu indexable reste sur `unpro.ca`.**
> Les sous-domaines sont traités comme des domaines séparés par Google.
> Diviser le SEO sur des sous-domaines = perdre l'autorité accumulée.

---

## 2. Routing Strategy

### 2.1 Root Domain — `unpro.ca`

**100% SEO / AEO pages + landing publiques**

```
unpro.ca/                           → Home (intent-based)
unpro.ca/services/:service/:city    → Service × Ville (programmatique)
unpro.ca/probleme/:problem/:city    → Problème × Ville
unpro.ca/renovation/:type/:city     → Rénovation × Ville
unpro.ca/profession/:slug           → Page métier
unpro.ca/ville/:slug                → Page ville
unpro.ca/s/:slug                    → Pages SEO dynamiques (DB)
unpro.ca/blog/:slug                 → Articles
unpro.ca/guides/:slug               → Guides
unpro.ca/verifier-entrepreneur      → Vérification publique
unpro.ca/comment-ca-marche          → How it works
unpro.ca/entrepreneur               → Landing entrepreneur
unpro.ca/condo                      → Landing condo
```

**Caractéristiques :**
- Canonical strict vers `unpro.ca`
- JSON-LD sur chaque page
- Internal linking mesh automatique
- Sitemap XML segmenté
- Meta robots configuré par page
- Target : 30 000+ pages indexables

### 2.2 App Subdomain — `app.unpro.ca`

**Plateforme SaaS authentifiée**

```
app.unpro.ca/login                  → Connexion
app.unpro.ca/signup                 → Inscription
app.unpro.ca/onboarding             → Onboarding
app.unpro.ca/dashboard              → Dashboard propriétaire
app.unpro.ca/pro/*                  → Dashboard entrepreneur
app.unpro.ca/admin/*                → Administration
app.unpro.ca/condos/dashboard       → Condo manager
app.unpro.ca/alex                   → Alex conversationnel
app.unpro.ca/booking/*              → Réservation
```

**Caractéristiques :**
- `noindex, nofollow` sur toutes les pages
- Auth required (sauf login/signup)
- Session persistence
- Private data (RLS enforced)

### 2.3 API Subdomain — `api.unpro.ca` (Phase 2)

```
api.unpro.ca/v1/scoring             → AIPP scoring
api.unpro.ca/v1/matching            → Matching engine
api.unpro.ca/v1/agents              → Agent orchestration
api.unpro.ca/v1/outreach            → Outreach engine
api.unpro.ca/v1/scraping            → Scraping pipeline
```

> Actuellement : les Edge Functions Supabase sont accessibles via
> `https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/`
> Phase 2 : proxy via Cloudflare Workers sur `api.unpro.ca`

---

## 3. User Flow — SEO → App

```
1. User lands on unpro.ca/isolation-grenier-laval
   ↓ (SEO content + Alex preview + CTA)
2. Click CTA → "Obtenir mon rendez-vous"
   ↓ (redirect to app.unpro.ca with UTM params)
3. app.unpro.ca/onboarding?intent=isolation&city=laval
   ↓ (login / signup / continue)
4. app.unpro.ca/dashboard → booking flow
```

### Redirect Implementation

```typescript
// Sur unpro.ca — CTA redirect
const APP_BASE = "https://app.unpro.ca";

function buildAppUrl(intent: string, city?: string) {
  const params = new URLSearchParams({ intent });
  if (city) params.set("city", city);
  params.set("utm_source", "seo");
  params.set("utm_medium", "organic");
  return `${APP_BASE}/onboarding?${params}`;
}
```

---

## 4. Canonical Strategy

### Rules

| Page Type | Canonical |
|-----------|-----------|
| SEO pages | `https://unpro.ca/{path}` |
| App pages | **NONE** (noindex) |
| Blog | `https://unpro.ca/blog/{slug}` |
| DB-driven SEO | `https://unpro.ca/s/{slug}` |
| Duplicate/variant | Canonical vers la page principale |

### Implementation

Le `CanonicalManager` centralise la logique :
- Toutes les pages SEO utilisent `unpro.ca` comme domaine
- Les pages app sont marquées `noindex`
- Les pages avec paramètres UTM ont un canonical sans UTM
- Les trailing slashes sont normalisés

---

## 5. Sitemap Strategy

### Sitemap Index (segmenté)

```
unpro.ca/sitemap.xml                → Index principal
unpro.ca/sitemaps/static.xml        → Pages statiques
unpro.ca/sitemaps/cities.xml        → Pages villes
unpro.ca/sitemaps/problems.xml      → Pages problèmes
unpro.ca/sitemaps/services.xml      → Pages services×villes
unpro.ca/sitemaps/renovations.xml   → Pages rénovations×villes
unpro.ca/sitemaps/guides.xml        → Guides
unpro.ca/sitemaps/blog.xml          → Articles blog
unpro.ca/sitemaps/seo-pages.xml     → Pages SEO DB-driven
```

### Edge Function `sitemap`

Génère dynamiquement le XML en combinant :
1. Pages statiques (registry client-side)
2. Pages DB-driven (`seo_pages` table)
3. Blog articles (`blog_articles` table)

---

## 6. DNS Configuration (Cloudflare)

```
# Root domain — Lovable hosting
unpro.ca          A     185.158.133.1
www.unpro.ca      A     185.158.133.1
_lovable          TXT   lovable_verify=...

# App subdomain — Lovable (separate project or same)
app.unpro.ca      CNAME lovable-app-proxy.lovable.app

# API subdomain — Supabase (Phase 2)
api.unpro.ca      CNAME clmaqdnphbndvmmqvpff.supabase.co

# CDN subdomain — Supabase Storage (Phase 2)
cdn.unpro.ca      CNAME clmaqdnphbndvmmqvpff.supabase.co
```

---

## 7. Phase Plan

| Phase | Deliverable | Timeline |
|-------|-------------|----------|
| **Phase 1** (NOW) | `unpro.ca` SEO engine sur Lovable, canonical manager, sitemap edge function | Immédiat |
| **Phase 2** | `app.unpro.ca` séparé, proxy API | Quand app scale |
| **Phase 3** | `cdn.unpro.ca`, edge geo-routing | Quand 10K+ images |

### Phase 1 — Current Architecture

> **Actuellement, tout tourne sur un seul projet Lovable.**
> Le routing est géré côté client (React Router).
> Les pages SEO et l'app cohabitent sur le même domaine.
>
> **Ce qui est fait maintenant :**
> - Canonical URLs pointent vers `unpro.ca`
> - Sitemap XML dynamique via edge function
> - CanonicalManager utilitaire
> - SEO pages noindex correctement gérées

### Phase 2 — Séparation App

Quand le produit scale :
1. Créer un second projet Lovable pour `app.unpro.ca`
2. Migrer les routes authentifiées
3. Configurer les redirects SEO → App
4. Garder la DB Supabase partagée

---

## 8. Anti-Patterns

❌ Ne JAMAIS mettre de contenu SEO sur un sous-domaine
❌ Ne JAMAIS dupliquer du contenu entre domaines
❌ Ne JAMAIS laisser des pages app indexables
❌ Ne JAMAIS utiliser des URLs avec paramètres comme canonical
❌ Ne JAMAIS avoir deux pages avec le même canonical

---

## 9. Invariants

1. `unpro.ca` = seule source d'autorité SEO
2. Toute page indexable a un canonical strict
3. Toute page app est `noindex`
4. Les sitemaps sont générés dynamiquement
5. Les redirects SEO→App préservent le contexte (intent, city)
6. Aucun contenu dupliqué entre domaine et sous-domaines
