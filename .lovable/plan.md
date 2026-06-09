
# Page ISR — `/entrepreneur/isolation-solution-royal`

Page profil publique haute fidélité pour **Isolation Solution Royal** (isroyal.ca), avec données réelles scrappées en live et une couche admin cachée (cockpit de vente). CTA principal : planifier une évaluation 15 min avec l'équipe UNPRO.

## 1. Route + accès

- Route publique : `/entrepreneur/isolation-solution-royal` (indexable, SEO `SeoHead` + JSON-LD `LocalBusiness`).
- Cockpit admin caché sur la même page :
  - Affiché uniquement si `?admin=1` + session admin (`adminGuard`), OU bouton flottant si `has_role(auth.uid(),'admin')`.
  - Tout est sur la même URL — pas de page séparée.

## 2. Données réelles (live Firecrawl, cache 24h)

Nouvelle table `contractor_intel_snapshots` (slug, source, payload jsonb, fetched_at) + edge function `fetch-contractor-intel` :

1. `firecrawlScrape('https://isroyal.ca', { formats:['markdown','links','branding','summary'] })` → identité, services, ton, couleurs, logo.
2. `firecrawlSearch('Isolation Solution Royal avis Google', { tbs:'qdr:y', limit:10 })` → avis + note moyenne.
3. `firecrawlScrape` ciblé sur la fiche Google Business et le profil RBQ pour licence + années d'expérience.
4. Cache 24h dans `contractor_intel_snapshots`; refresh manuel via bouton admin.

Edge function expose `GET /fetch-contractor-intel?slug=isolation-solution-royal` → renvoie le snapshot agrégé.

## 3. UI publique (theme Cinematic Dark, alex-immersive)

Sections, dans l'ordre :

1. **Hero** — logo ISR (depuis branding Firecrawl), nom légal *9480-0976 Québec inc.*, RBQ, badge "Spécialiste de l'entretoit", note Google + nombre d'avis, territoires (Laval, Montréal, Rive-Nord, Lanaudière), CTA principal **« Planifier une évaluation 15 min »**.
2. **À propos** — résumé Firecrawl (`summary`) réécrit fr-CA.
3. **Services** — pills issus de `ISR_BRAND.services` + tout service détecté en plus via scrape.
4. **Avis récents** — 3-5 cartes, citation + auteur + date + étoiles, source Google.
5. **Couverture territoire** — carte simple (liste de villes desservies, badges).
6. **Coordonnées** — téléphones cliquables (514-249-9522 / 514-941-3141), site `isroyal.ca`.
7. **CTA final** — bloc booking 15 min.

Conformité readability rule : wrap `.alex-immersive`, tokens `--text-*`, aucune opacité <70% sur le texte.

## 4. Évaluation 15 min (CTA principal)

- Composant `EvaluationBookingPanel` : intro courte + sélecteur de créneau (réutilise la logique de `bookings`/`availability_slots`; sinon fallback formulaire simple → table `contractor_evaluation_requests`).
- Nouvelle table `contractor_evaluation_requests` (contractor_slug, contact_name, email, phone, preferred_slot, message, status `pending|booked|completed`, source). RLS : insert ouvert (anon+auth), select admin only.
- Submit → edge function `book-contractor-evaluation` : crée la ligne, notifie Alex/équipe (log `system_events`), retourne confirmation.
- Confirmation inline + lien iCal optionnel (phase 2).

## 5. Cockpit admin caché (même page, gated)

Drawer latéral `IsrAdminCockpit` (visible admin seulement), 4 onglets :

1. **Score AIPP + analyse concurrentielle** — appelle `aipp-real-scoring-engine` sur `isroyal.ca` (réutilise existant), affiche score /100, breakdown 5 piliers, gaps SEO vs top 3 concurrents (Semrush si dispo, sinon Firecrawl SERP).
2. **Estimation revenu / manque à gagner** — réutilise `outbound-aipp-revenue-loss` logique : volume estimé × ticket moyen × gap conversion = $ perdus/mois + delta Signature.
3. **Notes Alex / CRM** — historique contact (`launch_pipeline_events` filtré par contractor), status deal, prochaine action, champ note libre persisté dans `contractor_intel_snapshots.notes`.
4. **Plan reco + scarcity territoire** — appelle `recommendPlan()` (Signature) + `FounderAvailabilityChecker` pour Laval/Signature, affiche slots restants, bouton "Générer lien checkout Signature 1$" (réutilise edge `create-isr-demo-checkout`).

Bouton "Refresh intel" en haut du cockpit → invoque `fetch-contractor-intel?force=1`.

## 6. Détails techniques

- **Nouveau fichier** : `src/pages/entrepreneur/PageContractorPublicProfileISR.tsx` (page assemblage).
- **Nouveaux composants** : `IsrPublicHero`, `IsrServicesGrid`, `IsrReviewsStrip`, `IsrTerritoryCoverage`, `EvaluationBookingPanel`, `IsrAdminCockpit` (+ 4 sous-panels) dans `src/components/entrepreneur/isr/`.
- **Hook** : `useContractorIntel(slug)` (React Query, 5 min stale).
- **Routes** : ajouter route dans `src/app/App.tsx` (publique).
- **Edge functions** : `fetch-contractor-intel`, `book-contractor-evaluation` (npm:@supabase/supabase-js@2/cors, esm.sh import, `verify_jwt=false` pour la lecture publique).
- **Migrations** : `contractor_intel_snapshots`, `contractor_evaluation_requests` avec GRANTs + RLS.
- **Secrets requis** : `FIRECRAWL_API_KEY` (vérifier connecteur ; si absent, demander en build).
- **SEO** : `<title>Isolation Solution Royal — Spécialiste de l'entretoit · UNPRO</title>`, meta desc <160 char, JSON-LD `LocalBusiness` + `AggregateRating`, canonical absolu.

## 7. Hors scope (à confirmer si on doit l'inclure)

- Authentification Google Business officielle (on lit via Firecrawl, pas l'API Google).
- Synchronisation calendrier ICS bidirectionnelle (phase 2).
- Génération automatique de pages pour d'autres entrepreneurs (ce build est ISR-spécifique mais structuré pour devenir générique via `:slug` plus tard).
