

# UNPRO Sniper Outreach Engine v1 — Full Implementation

## Summary

The database schema, scoring logic, and a basic command center shell exist. This plan builds the 5 backend edge functions (import, enrich, generate assets, queue send, update heat), expands the command center with territory gaps / rep queue / CSV import / target detail, and wires the full pipeline loop.

---

## Technical Details

### Block 1 — Edge Function: `sniper-import-targets`

New Deno edge function at `supabase/functions/sniper-import-targets/index.ts`.

**Input**: `{ targets: Array<{ businessName, city?, category?, websiteUrl?, phone?, email?, rbqNumber?, neqNumber?, sourceCampaign? }>, campaignId? }`

**Flow**:
1. Validate input array (max 500 per batch)
2. For each target: normalize business name, phone, domain using same logic as `normalizers.ts`
3. Deduplicate against existing `sniper_targets` by (business_name + city) or (phone) or (domain)
4. Insert new rows with `enrichment_status: 'pending'`, `outreach_status: 'not_started'`
5. Return `{ imported, skipped_duplicates }`

Uses `https://esm.sh/@supabase/supabase-js@2.49.1`.

### Block 2 — Edge Function: `sniper-enrich-target`

New Deno edge function at `supabase/functions/sniper-enrich-target/index.ts`.

**Input**: `{ targetId: string }`

**Flow**:
1. Load target from `sniper_targets`
2. **Normalize**: clean name, phone, domain
3. **Match**: check `contractors` table for existing match by business_name+city or phone or domain. If found, link `contractor_id`
4. **Enrich signals**: detect website presence (HEAD request), HTTPS check, parse domain for service clues
5. **Score**: compute `sniper_priority_score` using the existing `computeSniperPriority` formula (server-side copy), plus sub-scores (revenue_potential, readiness, pain_upside, strategic_fit, contactability)
6. **Channel recommendation**: email-first if email exists + score >= 60, SMS-first if phone + no email, dual if score >= 80
7. Update target row with all enrichment data, set `enrichment_status: 'enriched'`
8. Return enriched target

### Block 3 — Edge Function: `sniper-generate-assets`

New Deno edge function at `supabase/functions/sniper-generate-assets/index.ts`.

**Input**: `{ targetId: string }`

**Flow**:
1. Load enriched target
2. If `sniper_priority_score < 60`, skip with `{ skipped: true, reason: 'below_threshold' }`
3. **Generate outreach target**: Create row in `outreach_targets` with slug (kebab-case business_name + city), secure_token (crypto.randomUUID), payload from target data, `landing_status: 'prepared'`
4. Link `latest_outreach_target_id` on sniper target
5. **Generate message variants**: For each applicable channel (email/SMS based on recommendation), generate 3 variant_types (curiosity, weak_signals, founder_scarcity) using the exact template copy from the prompt with variable interpolation
6. Mark first variant as `is_selected: true`
7. Set target `outreach_status: 'page_ready'` or `'message_ready'`
8. If score >= 80 and contractor_id exists, invoke `aipp-run-audit` to precompute partial audit

### Block 4 — Edge Function: `sniper-queue-send`

New Deno edge function at `supabase/functions/sniper-queue-send/index.ts`.

**Input**: `{ targetId: string }` or `{ batchSize?: number }` for batch mode

**Flow**:
1. Single mode: load target + selected message variant, create `sniper_send_queue` entry with `send_status: 'queued'`
2. Batch mode: select up to `batchSize` targets where `outreach_status = 'message_ready'` and no existing queue entry
3. For each queued item: placeholder for actual send integration (mark as `sent` for now, real Resend/Twilio integration later)
4. Update target `outreach_status: 'sent'`
5. Log engagement event `email_sent` or `sms_sent`

### Block 5 — Edge Function: `sniper-update-heat`

New Deno edge function at `supabase/functions/sniper-update-heat/index.ts`.

**Input**: `{ targetId?: string }` (single) or `{}` (all with engagement)

**Flow**:
1. For each target, aggregate `sniper_engagement_events` using heat weights:
   - email_open: 5, click: 15, page_view: 10, identity_confirmed: 15, audit_started: 20, audit_completed: 20, recommendation_viewed: 10, checkout_started: 25
2. Update `heat_score` on `sniper_targets`
3. If heat >= 70, set tag `close_now`
4. Return updated counts

### Block 6 — Command Center Expansion

Rewrite `PageSniperCommandCenter.tsx` with 4 tabs and CSV import:

**New tabs:**
- **Territory Gaps**: Group targets by city × category, show supply_needed count, active targets, conversions, gap score
- **Rep Queue**: Show targets ordered by heat DESC where `outreach_status` in engaged/audit_started, with action buttons (Call, Resend, Ignore)

**CSV Import panel:**
- File upload button
- Parse CSV client-side (Papa Parse)
- Preview table showing parsed rows
- "Importer" button calling `sniper-import-targets`
- Success/error feedback

**Target Detail Drawer:**
- Click any target row to open a side drawer
- Show: all fields, enrichment signals, message variants, engagement timeline, linked audit, heat history
- Action buttons: Enrich, Generate Assets, Queue Send, Update Heat

**Pipeline tab enhancements:**
- Add status filter dropdown
- Add bulk action buttons: "Enrichir tout", "Générer pages", "Envoyer batch"
- These call the respective edge functions

### Block 7 — Batch Orchestration Buttons

In the command center, wire bulk actions:
- "Enrichir les pendants" → loops `sniper-enrich-target` for all `enrichment_status = 'pending'`
- "Générer les assets" → loops `sniper-generate-assets` for all enriched + no outreach target
- "Envoyer le batch" → calls `sniper-queue-send` in batch mode

### Block 8 — Memory

Update `mem://features/instant-audit-intake-funnel` to include sniper engine edge functions and command center expansion.

---

## Files Created/Modified

| Action | File |
|---|---|
| Create | `supabase/functions/sniper-import-targets/index.ts` |
| Create | `supabase/functions/sniper-enrich-target/index.ts` |
| Create | `supabase/functions/sniper-generate-assets/index.ts` |
| Create | `supabase/functions/sniper-queue-send/index.ts` |
| Create | `supabase/functions/sniper-update-heat/index.ts` |
| Rewrite | `src/pages/admin/PageSniperCommandCenter.tsx` |
| Create | `src/components/sniper/SniperTargetDrawer.tsx` |
| Create | `src/components/sniper/SniperCsvImport.tsx` |
| Create | `src/components/sniper/SniperTerritoryGaps.tsx` |
| Create | `src/components/sniper/SniperRepQueue.tsx` |
| Create | `src/components/sniper/SniperBulkActions.tsx` |
| Modify | `mem://features/instant-audit-intake-funnel` |

