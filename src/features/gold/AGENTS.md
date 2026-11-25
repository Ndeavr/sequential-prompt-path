# GOLD
- GOLD reads a public-safe membership table; allocation/refund follow canonical signed Stripe journals via database triggers, never redirects. Why: avoid a second payment engine and client-forged awards.
- Keep schema under staged/unpro-gold until backup/target preflight passes; unknown hosted membership/availability never becomes zero or an active badge. Why: protect live infrastructure and truthful scarcity.
- Since dates use only unpro_registered_at in America/Toronto, never imported profile creation. Why: imports are not membership events.
