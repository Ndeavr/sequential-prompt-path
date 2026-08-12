# Profil public Pavage Alpha — /entrepreneurs/pavage-alpha-laval

## Ce que l'inspection montre (vérifié)

- Aucune fiche « Pavage Alpha » n'existe : recherche sur `contractors` par nom, téléphone normalisé `5142629791` et domaine `pavagealpha` → 0 résultat. Il n'y a donc pas de doublon à fusionner, seulement une fiche à créer.
- La route profil publique existante est **`/entrepreneur/:slug`** (`ContractorSeoPage`), et la réclamation existante est **`/entrepreneur/:slug/reclamer`** (`PageClaimWizard`).
- **Conflit d'URL** : `/entrepreneurs/:slug` (au pluriel) est déjà pris par `PageHomeownerBookingFunnel`. L'URL canonique demandée entrerait en collision avec un parcours existant.
- Tables réutilisables : `contractors`, `contractor_services`, `contractor_service_areas`, `contractor_media`, `contractor_credentials`, `contractor_public_pages`, vue `v_contractor_public_profile`. Sections déjà écrites : `AboutContractor`, `StructuredServices`, `ServiceAreaMap`, `CompatibilityCard`, `SmartFAQ`, `MediaGallery`, `ProjectsShowcase`, `VerificationsByProfession`.
- `PageClaimWizard` est un flux 4 écrans avec paiement 1 $, **sans étape OTP** ni validation NEQ/RBQ. Le parcours en 12 étapes demandé n'existe pas encore tel quel.
- Il n'existe pas de table générique de corrections pour entrepreneurs (`aipp_profile_corrections` est liée aux profils AIPP, pas à `contractors`).

## Décisions à trancher avant de coder

1. **URL canonique.** Le pluriel est occupé. Proposition : servir la page sur la route canonique existante `/entrepreneur/pavage-alpha-laval` et rediriger `/entrepreneurs/pavage-alpha-laval` vers elle (301 via `LEGACY_REDIRECTS`). Aucune route existante n'est cassée.
2. **Portée du flux de réclamation.** Le 1 $ Stripe et la confirmation d'entreprise existent déjà ; OTP, NEQ, RBQ et assurance n'existent pas dans ce flux. On livre d'abord le chemin réel (confirmation → 1 $ → complétion guidée), et les étapes OTP/NEQ/RBQ sont ajoutées ensuite plutôt que simulées.

## Étape 1 — Données réelles, avec provenance

Insérer Pavage Alpha via migration (aucune donnée inventée) :
- `contractors` : nom public, catégorie « Pavage et asphalte », ville Laval, téléphone `514-262-9791`, site `pavagealpha.ca`, `verification_status = unverified`, `claim_status = unclaimed`. Aucune adresse civique (trois adresses publiques contradictoires), aucun NEQ affiché, aucune note, aucun nombre d'avis.
- `contractor_services` : les 10 sous-catégories, statut **déclaré**, groupées en Installation / Réparation-entretien / Commercial-industriel.
- `contractor_service_areas` : Laval, Montréal, Rive-Sud, régions environnantes — statut **déclaré**, sans rayon kilométrique.
- `contractor_public_pages` : slug `pavage-alpha-laval`, titre, meta, sources publiques (site officiel, Facebook, Wheree, Indeed) et date de révision 12 août 2026.
- Chaque champ porte sa provenance : `value`, `verification_status` (Vérifié / Déclaré / Inféré / En attente), `source_url`, `observed_at`, `confidence`. On étend les colonnes existantes si nécessaire plutôt que de créer une architecture parallèle.

## Étape 2 — La page

Rendu via le shell canonique UNPRO (header/footer existants, `PageShell`), thème clair bleu pâle, cartes blanches, mobile-first. Sections dans l'ordre demandé :

1. Hero : nom, sous-titre, description, badges (Laval, Résidentiel, Commercial, Industriel, Profil non réclamé), CTA « Vérifier la compatibilité », « Demander un rendez-vous », « Appeler le 514-262-9791 », lien discret de réclamation, barre CTA fixe mobile (Vérifier / Appeler).
2. État du profil UNPRO : liste des 8 vérifications avec leur statut réel + phrase d'explication. Jamais « Vérifié par UNPRO » ni « Recommandé ».
3. À propos + lien externe `rel="noopener noreferrer"`.
4. Services en trois familles, reliés aux entrées `contractor_services` (aucune page de service vide).
5. Territoires déclarés + mention de confirmation.
6. Synthèse des commentaires publics : points positifs observés, points à clarifier, encadré « avant de signer », lien vers la source. **Aucune note reprise de Wheree, aucun AggregateRating.**
7. Perspective d'un employé (Indeed), isolée, avec avertissement, exclue de toute note qualité.
8. Compatibilité : réutilise `CompatibilityCard` branché sur le parcours Alex existant, 7 questions une à la fois, photos si le composant existe. Résultats limités aux 5 verdicts autorisés ; profil non réclamé → message de confirmation préalable + CTA « Trouver une entreprise vérifiée ». La demande est enregistrée dans le workflow de demande existant avec `source = pavage-alpha-profile`.
9. Réalisations : images réelles seulement, sinon état vide élégant.
10. FAQ (7 questions) reprenant exactement les statuts de la page.
11. Réclamation : carte forte → `/entrepreneur/pavage-alpha-laval/reclamer` (flux réel, Stripe live 1 $). Aucune simulation de paiement ; erreurs Stripe/OTP affichées et journalisées.
12. Sources publiques repliables + bouton « Signaler une correction ».

Formulaire de correction : entreprise, champ contesté, correction demandée, preuve/URL, nom, téléphone/courriel, date, statut. Nouvelle table `contractor_profile_corrections` (aucune équivalente n'existe), RLS : insertion publique limitée anti-spam, lecture réservée aux admins, validation serveur.

## Étape 3 — SEO et données structurées

Canonical, Open Graph, Twitter Card, breadcrumb, H1 unique, liens internes (pavage, asphalte, Laval, Montréal, vérification d'entrepreneur). JSON-LD limité à `HomeAndConstructionBusiness` (localisation Laval, QC, CA — sans adresse civique), `Service`, `areaServed`, `FAQPage`, `BreadcrumbList`. Pas d'`AggregateRating`, pas de `Review`, pas d'horaires, pas de RBQ.

## Étape 4 — Sécurité, analytique, QA

- RLS : lecture publique du profil publié uniquement ; aucune écriture publique sur `contractors` ; corrections en attente jusqu'à validation admin ; journalisation des changements de statut.
- Événements analytiques réutilisant le système existant : `contractor_profile_viewed`, `compatibility_started/completed`, `appointment_requested`, `phone_clicked`, `website_clicked`, `claim_started`, `claim_payment_started/succeeded/failed`, `correction_submitted`, tous avec `source = pavage-alpha-profile`.
- QA mobile et desktop réels (Playwright 390 px et 1280 px) : pas de débordement horizontal, téléphone cliquable, FAQ utilisable, Alex lisible au-dessus du clavier, CTA fixe qui ne masque rien, aucun bloc sombre illisible, aucun faux badge.

## Livrable final

Rapport factuel : URL en ligne, données insérées et leur provenance, statut réel du parcours de réclamation (jusqu'où le 1 $ Stripe live va réellement), résultats des tests mobile/desktop, et blocage précis s'il en reste un.
