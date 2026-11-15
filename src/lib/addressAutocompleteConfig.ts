/**
 * UNPRO — Address autocomplete switch.
 *
 * Google Places (via the `google-places-autocomplete` function) is a paid,
 * usage-metered service. Launch runs without it: every address field falls
 * back to a manual, DECLARED address (never presented as geocoded/verified).
 * Flip to `true` only after the founder approves the Google Maps spend again;
 * no other code change is needed.
 */
export const ADDRESS_AUTOCOMPLETE_ENABLED = false;
