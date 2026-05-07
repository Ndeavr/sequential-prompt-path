# Accès privé `/cyndia` — Keypad 4 chiffres + Dashboard appels

## 1. Flow utilisateur

```
unpro.ca/cyndia
  ├─ 1ère visite: keypad → entrer code → confirmer (2x) → code créé
  ├─ Visites suivantes: keypad → entrer code → unlock
  └─ Unlock → magic link partenaire → /partenaire/dashboard
                                       └─ Section "Mes 30 prochains appels"
                                          ├─ Liste 30 prospects (statut = todo)
                                          ├─ Boutons statut par appel
                                          └─ Bouton "Générer plus" (si tous statués)
```

## 2. Backend

### Table `private_access_slugs`
| col | type |
|---|---|
| slug | text PK (`cyndia`) |
| code_hash | text (bcrypt du PIN) |
| partner_user_id | uuid (compte partenaire à connecter) |
| created_at, last_unlock_at | timestamptz |
| unlock_count | int |

RLS: aucune lecture client. Tout passe par edge functions service-role.

### Table `partner_call_assignments`
| col | type |
|---|---|
| id | uuid |
| partner_id | uuid → partners.id |
| lead_id | uuid → entrepreneur_leads.id |
| status | text (`todo`, `called`, `no_answer`, `interested`, `not_interested`, `callback`) |
| notes | text |
| called_at | timestamptz |
| created_at | timestamptz |

RLS: partner peut lire/update ses propres assignments.

### Edge functions
- `private-access-init` — POST `{slug, code, confirm}` : si slug n'a pas de code_hash, le crée; sinon erreur. Crée le partner si n'existe pas (Cyndia, type=`recruiter`, status=`approved`).
- `private-access-unlock` — POST `{slug, code}` : vérifie hash, retourne `{magic_link}` via `supabase.auth.admin.generateLink({type:'magiclink', email: partner.email})`.
- `partner-calls-generate` — POST : pioche N=30 leads dans `entrepreneur_leads` (ou `outbound_leads`) non encore assignés à ce partner et insère des rows `todo`. Refuse si appels `todo` restants > 0.

## 3. Frontend

### `src/pages/private/PagePrivateKeypad.tsx` (route `/cyndia` et `/private/:slug`)
- Composant `Keypad4` (clavier numérique premium dark, gros chiffres, vibration sur tap mobile).
- 2 états: `unlock` ou `setup` (détecté via call init `check`).
- Si setup: 2 saisies consécutives, doivent matcher.
- Sur succès unlock: `window.location.href = magic_link` → Supabase termine le login → redirige `/partenaire/dashboard`.

### `src/pages/partner/PartnerDashboard.tsx` — ajouter section
- `PartnerCallQueue` component:
  - Fetch `partner_call_assignments` join `entrepreneur_leads` where status='todo' limit 30, ordered.
  - Carte par appel: nom entreprise, ville, téléphone (cliquable `tel:`), site web.
  - Boutons rapides: Appelé / Pas de réponse / Intéressé / Pas intéressé / Rappeler.
  - Compteur "X / 30 traités".
  - Bouton "Générer 30 nouveaux" actif **seulement quand 0 todo restants**, sinon désactivé avec tooltip "Termine ta liste d'abord".

### Routes `src/app/router.tsx`
- Ajouter `<Route path="/cyndia" element={<PagePrivateKeypad slug="cyndia" />} />`
- (Optionnel) `/private/:slug` générique.

## 4. Sécurité
- Code PIN hashé bcrypt côté edge function (never stored cleartext).
- Rate limit: 5 tentatives / 15 min / IP via `private_access_attempts` table.
- Magic link à usage unique généré à chaque unlock (Supabase admin API).
- Slug `cyndia` codé en dur côté init pour ne créer qu'un partenaire connu (pas de création arbitraire).

## 5. Détails techniques
- Partner Cyndia auto-créé: email `cyndia@unpro.ca` (à confirmer), `partner_type='recruiter'`, `partner_application_status='approved'`, `partner_status='approved'`.
- `entrepreneur_leads` n'a pas de status — c'est `partner_call_assignments` qui porte le statut.
- Source des leads pour "générer": `entrepreneur_leads` non déjà assignés à Cyndia, ordre `created_at DESC`.

## 6. Tâches
1. Migration: `private_access_slugs`, `partner_call_assignments`, `private_access_attempts` + RLS + indexes.
2. Edge functions: `private-access-init`, `private-access-unlock`, `partner-calls-generate`.
3. Composant `Keypad4` + page `PagePrivateKeypad`.
4. Composant `PartnerCallQueue` intégré dans `PartnerDashboard`.
5. Route `/cyndia` ajoutée dans `router.tsx`.
6. Seed initial: créer partner Cyndia (via edge function au premier setup).

## Questions avant build
- Email de Cyndia pour le compte partenaire ? (default: `cyndia@unpro.ca`)
- Source des appels: `entrepreneur_leads` (existant, 9 colonnes) ou tu préfères `outbound_leads` ?
- Statuts d'appel souhaités exacts ?
