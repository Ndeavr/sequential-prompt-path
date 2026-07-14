
# Funnel Debug — Par Lead + Test E2E

Objectif unique : diagnostiquer et débloquer le premier entrepreneur payé 1 $. Aucune nouvelle fonctionnalité produit, uniquement observabilité + test réel.

## 1. Edge function `funnel-debug-leads` (GET)

Lecture seule. Agrège **par lead** (join sur `phone` / `contractor_id` / `session_id`) les 13 étapes canoniques :

`scraped` → `mobile_valid` → `sms_queued` → `sms_sent` → `sms_delivered` → `link_clicked` → `landing_view` → `alex_started` → `signup_started` → `signup_completed` → `checkout_opened` → `payment_completed` → `account_activated`

Sources déjà existantes :
- `launch_leads` : scraped, phone, category, city, mobile_valid
- `sms_events_v2` : queued/sent/delivered/failed + provider_error
- `contractor_funnel_events` : link_clicked, landing_view, alex_started, signup_*, checkout_*, payment_*, activation_*
- `platform_operation_outcomes` : failure_code / block_reason par lead

Sortie : `{ leads: [{ phone, category, city, steps: { [step]: { at, ok, error } }, first_break: {step, reason} }] }`. Trié par lead le plus avancé.

## 2. Edge function `funnel-debug-run-test` (POST)

Exécute un test E2E réel sur un lead test dédié (ou fourni en body : `{ phone, name, category, city }`).

Étapes séquentielles avec `reportOutcome()` à chaque succès/échec :

1. Insert (ou upsert) dans `launch_leads` (source=`funnel_debug_test`)
2. Appel `acq-sms-send` avec le lead → capture messageSid
3. Boucle poll (max 60 s) sur `sms_events_v2` pour statuts sent → delivered
4. Renvoie un objet `trace` contenant chaque étape + timestamps + erreurs
5. Écrit un enregistrement `funnel_debug_runs` (nouvelle table légère) pour historique

Le clic / landing / signup / checkout / activation ne peuvent pas être simulés côté serveur : la fonction retourne l’URL SMS générée + un token de suivi et la page admin affichera en temps réel la progression (polling toutes les 3 s) au fur et à mesure que l’humain (ou un headless futur) suit le lien.

## 3. Migration SQL minimale

```sql
create table public.funnel_debug_runs (
  id uuid primary key default gen_random_uuid(),
  started_by uuid references auth.users(id),
  lead_phone text not null,
  message_sid text,
  trace jsonb not null default '[]',
  status text not null default 'running',
  first_break_step text,
  first_break_reason text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
grant select, insert, update on public.funnel_debug_runs to authenticated;
grant all on public.funnel_debug_runs to service_role;
alter table public.funnel_debug_runs enable row level security;
create policy "admin read" on public.funnel_debug_runs for select
  to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admin write" on public.funnel_debug_runs for all
  to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
```

## 4. Page `/admin/funnel-debug`

- Header : compteur global (`X leads`, `Y payés`, `Z activés`) + bouton **« Tester le funnel complet »**.
- Tableau leads (mobile-first, scroll horizontal) — 1 ligne par lead, 13 colonnes d’étape :
  - Vert `✓ HH:mm` si événement présent
  - Rouge `✗ raison` si `failure_code` connu sur cette étape
  - Gris `—` si jamais déclenché
  - Ligne surlignée en rouge sur la **première rupture**
- Colonne détails : téléphone, catégorie, ville, `first_break_step` + raison lisible.
- Drawer par lead : timeline complète (réutilise `EventTimeline`), payload brut, boutons « Renvoyer SMS », « Simuler landing » (dev only).
- Bouton « Tester le funnel complet » :
  - Ouvre une modale avec le lead test par défaut (ENV `FUNNEL_DEBUG_TEST_PHONE`, éditable).
  - Appelle `funnel-debug-run-test`, affiche la trace live (auto-refresh 3 s pendant 5 min).
  - À la fin : affiche le **premier point de rupture** en rouge + suggestion de correction (mapping `FailureCode` → action).

## 5. Corrections automatiques possibles

Le prompt demande « corriger automatiquement lorsque possible ». Périmètre limité aux corrections **sûres et déjà connues** :

| Rupture détectée | Correction auto |
|---|---|
| `INVALID_PHONE` en masse | Marquer les leads `mobile_valid=false` (nettoyage) |
| `sms_queued` mais pas `sms_sent` >10 min | Requeue via `acq-sms-send` (max 1 retry) |
| `link_clicked` OK mais `landing_view` absent | Log warning + surligner : bug tracking front (pas de fix auto — nécessite code) |
| `signup_completed` mais `checkout_opened` absent | Relancer email/SMS de checkout via `launch-agent-checkout-sender` |
| `payment_completed` mais `account_activated` absent | Relancer `launch-agent-activation` |

Chaque correction auto est journalisée dans `platform_operation_outcomes` (operation=`funnel_debug_auto_fix`).

## 6. Sécurité

- Toutes les fonctions vérifient `has_role(user, 'admin')` via `admin.auth.getUser(token)` (même pattern que `funnel-audit-report` corrigé).
- Route `/admin/funnel-debug` sous `UniversalRouteGuard` role=admin.

## 7. Livrables (aucun autre fichier touché)

Nouveaux :
- `supabase/functions/funnel-debug-leads/index.ts`
- `supabase/functions/funnel-debug-run-test/index.ts`
- `supabase/functions/funnel-debug-autofix/index.ts`
- `supabase/migrations/<ts>_funnel_debug_runs.sql`
- `src/hooks/useFunnelDebug.ts`
- `src/pages/admin/AdminFunnelDebug.tsx`
- `src/components/admin/funnel/LeadStepsRow.tsx`
- `src/components/admin/funnel/TestFunnelModal.tsx`

Édités :
- `src/app/router.tsx` (route `/admin/funnel-debug`)

## 8. Critère de succès

Ouvrir `/admin/funnel-debug` → cliquer **Tester le funnel complet** avec le numéro fondateur → voir la ligne se remplir en temps réel jusqu’au premier `✗` rouge avec raison exploitable. Fin.
