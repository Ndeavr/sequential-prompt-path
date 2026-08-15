# Page d'atterrissage — Visibilité IA pour entrepreneurs

Nouvelle landing SEO/AEO/GEO à `/visibilite-ia-entrepreneurs`, en réutilisant l'architecture UNPRO existante (router, MainLayout, SeoHead, composants boutons/accordéon, table `leads`, Resend, journalisation d'événements).

## Ce qui est réutilisé (aucun système en double)

- **Route** : ajoutée dans `src/app/router.tsx` avec `MainLayout` (header/footer officiels, dock mobile) + constante dans `src/config/routesConfig.ts`.
- **SEO** : `SeoHead` (title, description, canonical, OG, Twitter, hreflang) + `SchemaStack` pour le JSON-LD. Image OG = `DEFAULT_OG_IMAGE` existante (aucune image factice).
- **Sitemap** : ajout de l'URL dans `public/sitemap-pages.xml`.
- **Capture** : table canonique `leads` déjà utilisée par la fonction Edge publique `entrepreneur-contact` (insertion `lead_type` + `payload` JSON, service role, RLS déjà en place — aucune migration prévue).
- **Notification** : Resend, déjà configuré dans les fonctions d'acquisition (`RESEND_API_KEY`).
- **Analytics** : `src/lib/analytics/logFunnelEvent.ts` (convention existante), aucun second système.

## Contenu et structure

Sections exactement telles que fournies : Hero (badge, H1 « Soyez recommandé par l'IA, pas seulement trouvé sur Google », 2 CTA + microtexte), Problème (6 éléments), Solution (7 services), Comparaison SEO vs AEO/GEO (complémentaires), Formulaire `#analyse-ia`, Plan personnalisé, FAQ (5 questions en accordéon accessible), CTA final.

Design clair/lumineux mobile-first (thème `landing-warm` déjà utilisé sur les pages publiques), un seul H1, hiérarchie H2/H3, aucun faux tableau de bord, aucune donnée inventée, aucun chiffre ni témoignage.

CTA fixe mobile discret propre à la page (« Appeler UNPRO » `tel:+15142499522` / « Analyse IA » ancre `#analyse-ia`), positionné au-dessus du dock existant, sans dupliquer `FloatingMobileCTA`.

## Formulaire (5 champs)

Nom de l'entreprise*, Votre nom*, Téléphone*, Site Web (facultatif), Principal service offert*.

- Validation client Zod + normalisation téléphone via `src/utils/formatPhone.ts` (E.164 `+1…`), site Web accepté avec ou sans `https://` via `formatWebsite.ts`.
- Honeypot discret + garde anti double-soumission (bouton désactivé + verrou de requête).
- États chargement / succès / erreur en français, messages liés aux champs (`aria-describedby`, focus visible).
- Message de succès exact demandé, sans redirection.

## Backend

Nouvelle fonction Edge publique `visibilite-ia-lead` (calquée sur `entrepreneur-contact`, pas de JWT) :

1. Validation Zod côté serveur (mêmes règles que le client) + rejet du honeypot.
2. Garde anti-doublon 24 h sur (téléphone + source), cohérente avec le garde existant.
3. Insertion dans `leads` : `lead_type: "agency_inquiry"`, `intent: "ai_visibility_audit"`, `status: "new"`, `language: "fr"`, `payload` = company_name, contact_name, phone normalisé, website, primary_service, source `visibilite_ia_entrepreneurs`, landing_page, utm_source/medium/campaign/content/term, referrer, consent context, submitted_at, ip/user_agent (mêmes champs que la fonction existante).
4. Notification interne Resend à l'adresse admin déjà utilisée, avec les infos du prospect et l'URL source. Échec de notification ⇒ prospect conservé, erreur journalisée, succès affiché à l'utilisateur.
5. Journal d'audit : soumission reçue, prospect créé, notification envoyée/échouée, doublon bloqué.
6. Aucune clé côté frontend ; aucune lecture publique des prospects (RLS `leads` inchangée, lecture admin existante).

Les prospects apparaissent dans l'admin existant `/admin/leads`.

## Données structurées

JSON-LD : `WebPage`, `Service` (visibilité IA pour entrepreneurs), `Organization` (données officielles UNPRO déjà présentes), `FAQPage` (les 5 questions réellement affichées), `BreadcrumbList`. Aucun `AggregateRating` ni `Review`.

## Analytics

Événements via le logger existant : affichage page, clic CTA hero, clic téléphone, début de formulaire, erreur de formulaire, soumission réussie, clic CTA final — avec source + UTM en métadonnées.

## Tests

Playwright/production : chargement direct de la route, rendu 360/768/1280, meta + canonical + JSON-LD valides, liens `tel:+15142499522`, validation des champs, soumission avec et sans site Web, normalisation du téléphone, création réelle du prospect dans `leads` et visibilité dans `/admin/leads`, absence d'exposition publique, notification interne, conservation des UTM, double-clic bloqué, états loading/succès/erreur, présence dans le sitemap, console sans erreur.

## Détails techniques

- Fichiers créés : `src/pages/marketing/PageVisibiliteIA.tsx`, composants de section sous `src/features/aiVisibilityLanding/`, `supabase/functions/visibilite-ia-lead/index.ts`.
- Fichiers modifiés : `src/app/router.tsx`, `src/config/routesConfig.ts`, `public/sitemap-pages.xml`.
- Aucune migration Supabase prévue ; si la contrainte `lead_type` de `leads` refuse la nouvelle valeur, une migration minimale d'élargissement de contrainte sera proposée séparément.
