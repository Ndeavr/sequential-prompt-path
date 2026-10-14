# 03 — Lovable Master Prompt

> Canonical instructions for Lovable to execute the UNPRO build. Paste this as project knowledge or use as a reference prompt.

---

## Identity

You are building **UNPRO**, an AI-powered property intelligence platform for Quebec. The platform serves homeowners, contractors, and condo syndicates.

## Stack

- React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- Lovable Cloud (Supabase: Postgres, Auth, Edge Functions, Storage)
- Stripe for payments
- Lovable AI Gateway for all AI features

## Critical Rules

### Database
1. **Never create duplicate tables.** Before any migration, check `types.ts` and existing schema.
2. **Never FK to `auth.users`.** Use `user_id UUID` columns without foreign keys to auth schema.
3. **Contractors are NOT profiles.** `contractors` is a separate business entity table linked via `user_id`.
4. **RLS on all tables** with user data. Use `has_role()` for admin access.
5. **Use validation triggers** instead of CHECK constraints for time-based validations.
6. **Never modify** `auth`, `storage`, `realtime`, or `supabase_functions` schemas.
7. **Use the migration tool** for all schema changes. Never edit `types.ts` manually.

### Code
1. **Never edit** `client.ts`, `types.ts`, `config.toml`, or `.env` — these are auto-managed.
2. **Import Supabase** from `@/integrations/supabase/client`.
3. **Semantic tokens only** — use CSS variables from `index.css`, never hardcoded colors.
4. **Feature organization**: business logic in `src/features/`, pages in `src/pages/`, shared UI in `src/components/ui/`.
5. **Roles in `user_roles`** table only. Never store roles on profiles or in localStorage.

### Security
1. **Private by default**: properties, documents, projects, quotes.
2. **Storage buckets are private**. Use signed URLs.
3. **Admin checks server-side** via `has_role(auth.uid(), 'admin')`.
4. **No anonymous signups**. Standard email/password + optional OAuth.
5. **Email verification required** unless user explicitly requests auto-confirm.

### AI Features
1. **Use Lovable AI Gateway** for all AI capabilities — no external API keys needed.
2. Supported models: Gemini 2.5 Pro/Flash, GPT-5/Mini/Nano.
3. For edge functions needing AI, use the `LOVABLE_API_KEY` secret.

## Architecture Layers

```
L4: Public Authority — SEO pages, Answer Engine, Knowledge Graph
L3: Marketplace — Contractor profiles, AIPP, matching engine
L2: Decision — AI scoring, recommendations, cost estimates
L1: Property Intelligence — Properties, documents, events, Home Score
```

## Data Flow

```
User Input → Property/Project → Matching Engine → Contractor Recommendations
     ↓              ↓                    ↓
  Documents    Knowledge Graph      AIPP + DNA + CCAI Scores
     ↓              ↓                    ↓
  RAG Chunks    SEO Pages          Appointments + Quotes
```

## Key Relationships

- `profiles.user_id` → `auth.users.id` (trigger-created)
- `contractors.user_id` → `auth.users.id` (no FK)
- `properties.profile_id` → `profiles.id`
- `projects.property_id` → `properties.id`
- `projects.service_category_id` → `service_categories.id`
- `quotes.project_id` → `projects.id`
- `contractor_verification_runs.user_id` → `auth.users.id` (no FK)

## Naming Conventions

- Tables: `snake_case`, plural (`contractors`, `properties`)
- Columns: `snake_case` (`business_name`, `created_at`)
- Enums: `snake_case` (`app_role`, `verification_verdict`)
- Routes: kebab-case (`/contractor-onboarding`, `/home-score`)
- Components: PascalCase (`ContractorCard.tsx`, `HeroSection.tsx`)
- Hooks: camelCase with `use` prefix (`useAuth`, `useContractor`)

## Execution Protocol

1. Read the current schema from `types.ts` before any migration
2. Check for existing tables/columns to avoid duplicates
3. Create migration SQL via the migration tool
4. Implement frontend components referencing the new schema
5. Add RLS policies for every new table
6. Verify with console logs and network requests
7. Run acceptance criteria from `05_SELF_QA_AND_ACCEPTANCE.md`

---

_This prompt ensures Lovable builds consistently across sessions._


## Clara — onboarding conversationnel et suggestions multimédias (14 octobre 2026)

### Objectif et inspection
La conversation remplit directement le formulaire et le dossier existants pour les entrepreneurs et les propriétaires. Inspecter les routes, composants Clara/Alex, formulaires, mémoire, capture audio, uploads, edge functions, schéma, RLS et intégrations avant de modifier. Réutiliser les systèmes opérationnels; aucune double saisie, aucun profil, parcours ou système en double. Ces exigences s'appliquent à l'assistant existant, même si son nom interne est Alex.

### Questions et extraction
- Poser une seule question ouverte à la fois et rebondir sans redemander les informations déjà connues.
- Entrepreneurs : découvrir travaux préférés, territoires et exclusions, taille des contrats, disponibilité et objectifs (incluant marge de profit si pertinente).
- Exemple de question : « Décrivez-moi le contrat idéal pour vous. »
- Exemple de réponse : « Montréal, j’en peux plus; j’aime les gros projets où mon équipe reste plusieurs semaines. »
- Extraire seulement les critères utiles : Montréal à exclure, projets d’envergure préférés, chantiers de plusieurs semaines appréciés. Clarifier si nécessaire la différence entre préférence et exclusion ferme.
- Compléter progressivement les champs existants avec un résumé court et modifiable, sans recopier toute la transcription dans le formulaire.
- Préremplir les informations connues; conserver progression et corrections lors d’une navigation ou d’une reprise. Ne pas écraser silencieusement une correction manuelle.
- Faire valider le résumé (« C’est bien ça? »), puis poursuivre directement le parcours existant vers l’offre et le paiement pour les entrepreneurs, ou le dossier/projet pour les propriétaires.
- Distinguer informations déclarées, inférées, vérifiées et en attente. Ne jamais inventer scores, vérifications, statut RBQ, rendez-vous ni paiement.

### Microphone contextuel
Si la personne répond par texte et que la voix faciliterait l’échange, suggérer une fois :
« Vous pouvez aussi utiliser le micro pour me raconter ce que vous recherchez. Je m’occupe de remplir votre profil. »
Pour les propriétaires, adapter la fin : « Je m’occupe de compléter votre dossier. »
Faire doucement briller et pulser le bouton microphone pendant quelques secondes. Ne jamais activer automatiquement la capture. Laisser continuer par texte et éviter les invitations répétitives.

### Photos et vidéos des propriétaires
Lorsque les médias aideraient à comprendre le problème, le projet ou le design souhaité, proposer :
« Une photo ou une courte vidéo m’aiderait à mieux comprendre. Vous pouvez l’ajouter ici. »
Illuminer temporairement le bouton d’ajout. Une seule suggestion contextuelle à la fois, sans insister.
Relier les médias au dossier existant et extraire les observations utiles avec validation des éléments incertains. Respecter les formats et limites existants, le stockage privé, les permissions et les URLs signées. Afficher progression, erreur et nouvelle tentative.

### Simulation visuelle
Pour les rénovations visuelles pertinentes, proposer :
« Aimeriez-vous voir de quoi ces rénovations auraient l’air chez vous? »
Réutiliser le service de simulation existant, à partir de la photo du propriétaire et de ses préférences. Présenter le rendu comme une illustration du résultat possible.
N’afficher cette action que si le service est réellement opérationnel. Sinon, identifier le blocage externe dans le compte rendu technique; aucune fonctionnalité fictive.

### Frontend, backend et permissions
- Mobile-first; dernier message et commandes accessibles lors du redimensionnement et de l’ouverture du clavier. Texte stable et défilement naturel, synchronisé à la voix lorsque celle-ci est activée.
- Boutons accessibles et animations compatibles avec prefers-reduced-motion.
- Parcours propriétaires, condos et entrepreneurs strictement séparés.
- Persister via les services existants et sous les permissions du bon utilisateur; réutiliser la mémoire et les fonctions existantes. Migration uniquement si une lacune réelle est confirmée.
- Gérer refus d’accès au micro, interruption, réseau indisponible et échec de sauvegarde sans perdre la progression.
- Utiliser les journaux d’audit existants pour les mises à jour et erreurs, sans transcription brute ni données sensibles.

### Tests et critères de completion
Tester de bout en bout texte, voix, photos/vidéos, corrections, sauvegarde et reprise sur mobile et desktop. Vérifier qu’une information donnée une fois arrive réellement dans le bon champ et n’est pas redemandée dans le formulaire.
Vérifier le glow contextuel, l’absence d’activation automatique du micro et d’invitations répétées, les restrictions RLS et l’absence de mélange des rôles.
Tester la simulation uniquement avec le vrai service. Livrer les modifications, résultats des vérifications et éventuels blocages externes. L’ajout de ces instructions ne constitue pas en soi une implémentation ni un déploiement.
