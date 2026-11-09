# Calendar connection

- Calendar OAuth keeps the validated starting route through `return_to` (`src/lib/calendarReturn.ts`, contextual fallback only when absent) and shows Google as connected only from the saved row with both calendar scopes. Why: admins/contractors were sent to the Home Passport and saw contradictory states.
- The Google callback refuses to save a connection without both calendar scopes, keeps the chosen calendar only when the same Google account reconnects, and only 401/insufficient-scope responses mark a connection revoked (`isGoogleAuthFailure`). Why: reconnects wiped the selection and API-disabled/quota 403s falsely revoked contractors.
