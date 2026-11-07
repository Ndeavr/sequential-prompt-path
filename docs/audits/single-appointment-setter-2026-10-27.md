# UNPRO — One appointment setter, Clara only

Status: GitHub source repair, NOT production deployment or hosted E2E proof. No SMS, charge, calendar event or real appointment created.

## Verified baseline on 2026-10-27
- 0 appointment types; 12 weekly availability settings; 2 calendar connections, 0 connected; 0 cached busy periods; 0 smart bookings.
- Existing slot engine applies contractor-configured travel padding, NOT a verified driving time. No active routing provider was established; never call it optimized travel without provider evidence.
- Old alex-inline-booking returned confirmed based on chat session writes, not a real booking. Old public booking inserted directly without the locked RPC. The Google push marked written even without returned event ID.

## Single flow contract
Clara matches a legitimately eligible contractor, then directs the homeowner to the existing booking page. Only configured, real availability can produce up to THREE time options. The selected time is rechecked under a contractor-specific DB lock. Confirmed UNPRO booking requires a returned booking_id, then a write attempt to the contractor's selected connected Google Calendar, an in-app notice, and, when authorized/configured, an OS push or transactional SMS with provider status. No false confirmation after calendar or notification failure.

## Source changes
- Free appointments now use booking-confirm-slot, not browser insert. Paid checkout path preserved but needs separate payment/atomicity review.
- Server rejects paid/deposit/manual appointment types, invalid durations, min notice failures and contractors without enabled booking; Google push requires a returned event ID; in-app notification status is separate from phone delivery.
- Old chat helper no longer creates fake held or booked records and links to canonical /book/:slug instead.
- Slot chooser offers no more than three already-filtered candidates. No real route ETA is claimed.

## Critical follow-up before live release
1. Enforce appointment type, exact weekly hours, timezone/DST, min notice, travel and buffer rules INSIDE the existing confirm_smart_booking_slot transaction, not just in Edge. Currently the RPC guards conflicts and blackouts but not every policy.
2. Connect contractor Google calendars and choose exact read/write calendar. Refresh freeBusy before offering and before final booking; fail closed for revoked accounts and stale busy cache.
3. Add server-side verified driving route/duration using a provider with explicit budget authorization, address validation, time-of-day traffic, preceding/next jobs, minimum buffers. Contractor-configured padding is a fallback, not an ETA.
4. For a physical phone alert, connect and verify actual device push subscription or consent-compliant transactional SMS with deliverability evidence. Existing in-app notifications cannot prove a push to the phone.
5. Verify paid booking checkout and webhook does not bypass canonical booking and cannot double charge, plus cancellation/rescheduling.
6. Isolated E2E (synthetic): two simultaneous homeowners, invalid RBQ when applicable, timezone/DST, booked slot race, disconnected calendar, no address, travel gap, notification failure, mobile chat keyboard.

UNPRO base $350 12-month profile does not include a guaranteed appointment. Never invent one or sell one request to several contractors. No Lovable credits used in this source PR.
