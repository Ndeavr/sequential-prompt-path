# Public contractor profile

- Public territory maps pin only city centres from the public `cities` table, frame with clamped zoom and fall back to the city list plus an external city link; never business addresses, polygons or world views. Why: service areas are cities, not verified coverage zones.
- The above-the-fold contractor summary (`ProfileSummary`) is shared by the public profile and the dashboard phone preview; status comes only from `contractors.public_status`. Why: one truthful rendering, no fabricated badges.
