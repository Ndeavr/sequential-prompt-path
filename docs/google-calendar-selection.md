# Google calendar selection

The connection card and post-OAuth page offer a named calendar selector. No timed redirect or simulated availability preview. Google account connection and the selected calendar are distinct states.

- Server endpoint authenticates the caller and reads only their Google connection. OAuth tokens never reach the browser.
- CalendarList pagination includes hidden/shared calendars. Read-only calendars remain visible but cannot be selected as a destination for appointment writes.
- The server revalidates membership and role, reads real busy windows, then atomically saves the choice and replaces imported busy windows in the existing tables.
- Snapshot writes lock the connection and compare metadata versions; a stale synchronization cannot replace the selected calendar snapshot. UNPRO event blocks are preserved.
- Both busy synchronization and appointment event writes consume the saved ID. No silent primary-calendar fallback. Reauthorization requires explicit selection again.
- Endpoint is POST-only, validates the user token itself, and returns only calendar labels/IDs/roles and operation states.

The migration creates one service-only, security-invoker function. Installation changes no customer records. Preflight confirmed the function did not exist; rollback removes its exact eight-argument signature after reverting callers. No existing function definition was overwritten. The local Supabase CLI was unavailable; the SQL migration is tracked here and its definition was installed through the project database connector.

Validation: four synthetic tests cover paginated calendar lists, explicit selection, read-only controls, selected ID submission, and failed-save feedback. Edge bundles and frontend production build are checked. No real customer calendar was selected or written by QA. Real connection and selection require the account holder's Google authorization.

This does not complete the separate homeowner booking engine's address/travel checks or bridge published appointment slots to live calendar availability. Existing booking confirmation authorization shortcomings are outside this selector patch; the homeowner request UI does not invoke that route.
