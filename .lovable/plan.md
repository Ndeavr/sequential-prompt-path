## Problème confirmé
Le scrape précédent a halluciné « cellulose ». La home d'isroyal.ca dit explicitement :
> « Spécialistes en isolation soufflée à la **fibre de verre rose**, en décontamination et en ventilation optimale. »

ISR n'utilise **pas** de cellulose. Il faut corriger les données, enrichir avec les vrais médias (logo + photos), et brancher Google Calendar sur les rendez-vous.

---

## 1. Correction du matériau (data fix)

Migration `UPDATE public.signature_partners` pour `isolation-solution-royal` :

- `tagline` → « Spécialistes en **isolation soufflée à la fibre de verre rose**, décontamination et ventilation optimale »
- `services` (JSON) :
  - « Isolation d'entretoit (R-51 soufflée) » → description : *Fibre de verre rose soufflée haute performance jusqu'à R-51 pour stopper les pertes de chaleur et l'inconfort à l'étage.*
  - Tous les autres services revus pour retirer toute mention de cellulose.
- `brand.material_primary` = `"fibre_de_verre_rose"` (champ structuré pour l'UI et l'IA).

Mise à jour du composant `PageSignaturePartner.tsx` : ajout d'un **badge matériau** visible dans le hero (« Fibre de verre rose · R-51 ») pour qu'Alex et le visiteur ne confondent plus jamais.

---

## 2. Scraping réel des médias (logo + photos)

Refonte de l'edge function `partner-scrape-enrich` pour qu'elle **ne reformule plus librement** les services et qu'elle extraie les vrais assets :

- Firecrawl `/scrape` sur `https://isroyal.ca` avec `formats: ['html', 'links', 'branding']`
  - `branding` → récupère logo officiel + favicon + couleurs marque
- Firecrawl `/map` pour découvrir `/galerie`, `/realisations`, `/services/*`
- Scrape de la page galerie → extraction de tous les `<img src>` (filtrage : largeur ≥ 600px, pas d'icônes, pas de logos tiers)
- Téléchargement côté serveur dans le bucket Supabase Storage `partner-media/isolation-solution-royal/` :
  - `logo.svg` (ou png)
  - `hero.jpg` (1 photo héros choisie)
  - `gallery/01.jpg` … `gallery/12.jpg` (max 12)
- Persistance dans `signature_partners.media` :
  ```json
  { "logo_url": "...", "hero_url": "...", "gallery": ["...", "..."], "brand_colors": { "primary": "#...", "accent": "#..." } }
  ```
- **Garde-fou anti-hallucination** : pour les `services`, le LLM (Gemini) reçoit le markdown brut + instruction stricte « N'invente AUCUN matériau. Si non mentionné explicitement, laisse vide. Matériau autorisé pour ce partenaire : fibre de verre rose. »

Mise à jour de `PageSignaturePartner.tsx` :
- Header : logo officiel ISR (depuis `media.logo_url`) au lieu du fallback générique
- Nouvelle section **Galerie réalisations** (grille responsive 2 col mobile / 3 col desktop, lightbox au clic)
- Hero : `media.hero_url` en background avec overlay sombre

---

## 3. Google Calendar — rendez-vous directs

### 3a. Connexion
Utilisation du connecteur **Google Calendar** déjà documenté (gateway Lovable). Une connexion = le calendrier d'UNPRO côté plateforme (compte concierge). Chaque partenaire Signature reçoit un `calendar_id` dédié (sous-calendrier partagé) stocké dans `signature_partners.brand.google_calendar_id`.

> Pour ISR spécifiquement, on créera/utilisera un calendrier partagé `isolation-solution-royal@…` que ISR accepte dans son propre Google Workspace. Cela évite l'OAuth par-entrepreneur tout en synchronisant les deux côtés.

### 3b. Schéma DB
Ajout colonnes à `partner_bookings` :
- `google_event_id TEXT`
- `google_calendar_id TEXT`
- `google_sync_status TEXT` (`pending`, `synced`, `failed`)
- `google_sync_error TEXT`

### 3c. Edge function `partner-booking-submit` (refonte)
Après insertion DB :
1. Appel gateway `POST https://connector-gateway.lovable.dev/google_calendar/calendar/v3/calendars/{calendar_id}/events`
2. Body : `summary` (« RDV ISR · {client} »), `description` (besoin + tél + adresse + lien admin), `start`/`end` (slot choisi, fuseau `America/Toronto`, durée 60min par défaut), `attendees` (email client + email ISR), `reminders` (24h + 1h)
3. Stocker `google_event_id` + status
4. Si échec gateway → status `failed` + log dans `system_events`, le RDV reste valide côté DB (fallback email Resend déjà en place)

### 3d. Synchronisation des disponibilités (lecture)
Nouvelle edge function `partner-calendar-sync` (cron toutes les 15 min via `pg_cron` ou bouton manuel admin) :
- Lit les events Google Calendar des 30 prochains jours
- Marque les créneaux occupés dans `partner_calendar_availability` (retire le slot du tableau `slots`)
- Garantit qu'un slot booké directement dans Google par ISR disparaît du widget public

### 3e. UI
- Widget de booking inchangé visuellement, mais après soumission : toast « Rendez-vous confirmé — ajouté à votre agenda et à celui d'ISR »
- Section admin `/admin/partners` : indicateur de santé sync Google (dernière sync, nb events, erreurs)

---

## Détails techniques

**Tables modifiées**
- `signature_partners` : data correction + `media` enrichi
- `partner_bookings` : 4 colonnes Google
- Nouveau bucket Storage : `partner-media` (public read)

**Edge functions**
- `partner-scrape-enrich` (refonte avec garde-fous + storage upload)
- `partner-booking-submit` (ajout création event Google)
- `partner-calendar-sync` (nouveau, lecture bidirectionnelle)

**Connecteurs requis**
- Firecrawl (déjà connecté)
- **Google Calendar** (à connecter via `standard_connectors--connect` au moment du build)

**Fichiers front modifiés**
- `src/pages/partners/PageSignaturePartner.tsx` (logo dynamique, galerie, hero image, badge matériau)
- `src/features/partners/components/SignaturePartnerBookingWidget.tsx` (toast confirmation enrichie)
- `src/pages/admin/partners/PageAdminPartners.tsx` (santé sync Google)

---

## Critères de succès
- La carte « Isolation d'entretoit » affiche **fibre de verre rose**, plus jamais cellulose
- Le logo officiel ISR et au moins 6 vraies photos de réalisations apparaissent sur la page
- Un rendez-vous pris sur `/isolation-solution-royal` apparaît dans Google Calendar en < 5 secondes
- Un créneau bloqué directement dans Google disparaît du widget à la prochaine sync (≤ 15 min)