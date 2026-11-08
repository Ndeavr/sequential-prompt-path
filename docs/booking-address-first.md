# Address-first dashboard appointment requests

Route: `/dashboard/book/:id` → `src/pages/dashboard/BookingPage.tsx`.

- Appointment choices come from the contractor's active `booking_appointment_types`, including configured duration and free status. No generic plumbing/roofing/project category dropdown. The explicitly approved ISR inspection remains free and 60 minutes when types are not yet configured.
- Availability for the next 10 rolling days preloads on route entry, before address selection. React Query shares the in-flight request, caches it per contractor for 60 seconds, and refreshes stale data on check. Only published slots are cached, without homeowner address data.
- Explicit saved property/address selection or manual address and city required before checking. No first-property auto-selection. Editing a saved address detaches its property ID. No manager upsell on this step.
- This week, next week, earliest available, plus morning/afternoon/evening. Existing ISR draft address and daytime preference resume through the existing validated draft parser.
- Suggestions only use published `appointment_slots` after a recent connected-calendar status, filter by configured duration and Quebec calendar week, select up to three with day diversity, and clear after any input change. No generated fallback times.
- The existing request mutation remains a request. A selected published slot is checked again but is NOT atomically booked. UI explicitly states time/travel require confirmation; no scheduled/confirmed state is manufactured. Address, type, period and optional time are attached to the request.

## Remaining backend prerequisites

The legacy dashboard did not provide address-aware live booking. This UI change does not establish it. The canonical calendar OAuth connection, selected ISR calendar, published-slot synchronization, address-dependent travel calculation and an atomic appointment confirmation linked to homeowner ownership must be integrated before switching from requests to confirmed bookings. Existing `computeSmartSlots` ignores client coordinates, and `booking-confirm-slot` does not yet provide that complete contract. Do not bypass these gaps with generated time slots or client-side confirmation.

## Verification

Four focused tests (including preload before address selection, shared in-flight requests, and the ten-day query boundary) cover contractor-specific options, mandatory address, disconnected agenda, stale-result invalidation, Quebec week boundaries, duration filtering and a maximum of three distinct-day suggestions. Vite build passes (compression-size reporting disabled locally); root typecheck passes. Local Playwright mobile harness could not launch because the Chromium executable is unavailable. No live appointment, email, SMS, calendar event or customer record was created by QA.
