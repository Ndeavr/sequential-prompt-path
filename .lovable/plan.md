
Phase 2 — Branchement du Module Calendar Connection sur les 4 surfaces existantes.

## Objectif
Injecter le prompt de connexion calendrier au bon moment, avec le bon message, sur les 4 surfaces convenues — sans casser l'existant.

## Surfaces & stratégie d'injection

**1. Account page (`/account`)** — `src/pages/dashboard/AccountPage.tsx`
- Ajouter une section "Calendrier" après le formulaire profil
- Composant : `<CardCalendarConnectionRole role={activeRole} surface="account" />`
- Détection du rôle via `useActiveRole()` (déjà importé)
- Si multi-rôle : afficher une carte par rôle actif (homeowner + contractor)

**2. Dashboard homeowner (`/dashboard`)** — surface `dashboard_homeowner`
- Bannière sticky en haut : `<BannerCalendarMissingWarning role="homeowner" />`
- Auto-masquée si déjà connecté ou dismissed
- Localiser le fichier exact (probablement `src/pages/dashboard/DashboardPage.tsx` ou similaire)

**3. Dashboard pro (`/pro`)** — surface `dashboard_pro`
- Card readiness en haut : `<CardCalendarConnectionRole role="professional" surface="dashboard_pro" />`
- Message : "Activez la réception de RDV"

**4. Onboarding entrepreneur (`/entrepreneur/onboarding-voice`)** — surface `onboarding_contractor`
- Étape post-activation : injecter `<CardCalendarConnectionRole role="contractor" surface="onboarding_contractor" />`
- Position : après confirmation du profil, avant CTA final
- Skippable (bouton "Plus tard") — track `prompt_dismissed`

## Page de redirection finale
Vérifier `/calendar/connect/success` redirige proprement vers le dashboard du rôle après 3s OU bouton manuel.

## Fichiers à toucher
- `src/pages/dashboard/AccountPage.tsx` — section calendrier multi-rôle
- `src/pages/dashboard/DashboardPage.tsx` (à localiser) — bannière homeowner
- `src/pages/pro/*` (à localiser) — card readiness pro
- `src/pages/entrepreneur/OnboardingVoicePage.tsx` (à localiser) — step calendrier
- Aucune modif DB ni edge function (déjà en place Phase 1)

## Tracking
Chaque surface logge automatiquement `prompt_viewed` via `useCalendarConversionTracking` (déjà intégré dans `CardCalendarConnectionRole`).

## Hors scope (Phase 3 future)
- `PanelAlexCalendarPrompt` (intégration conversationnelle Alex)
- `WidgetCalendarSyncHealth` réel (sync logs)
- Nudges intelligents (table `calendar_connection_nudges`)
- Outlook placeholder
