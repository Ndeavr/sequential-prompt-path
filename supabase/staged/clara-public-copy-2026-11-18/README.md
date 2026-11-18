# Clara public copy (2026-11-18)

Data-only correction of customer-facing text that still said « Alex ». Applied once with `apply.sql`; `rollback.sql` restores the previous wording. No schema, key, path, slug, price or entitlement change; journal `updated_at` is not touched (no trigger on these tables).

Stripe catalogue (descriptions only, prices/IDs unchanged): active products `prod_UIGIooRAMh9OXb`, `prod_UICxPeEriL97k3`, `prod_UDyFiTjuUrwolV` updated « Alex » → « Clara ». Previous texts kept in the git history of this README:
- prod_UIGIooRAMh9OXb: « … accompagnement Alex avancé, vue consolidée premium »
- prod_UICxPeEriL97k3: « … territory lock, Alex IA premium. »
- prod_UDyFiTjuUrwolV: « … rendez-vous qualifiés, assistance Alex »
Inactive historical products still mentioning Alex were left untouched.
