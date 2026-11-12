# src/config rules

- Founder meeting CTAs read only `founderBooking.ts` (validated https or null); when null they scroll to the in-page picker, which shows live free slots from edge `founder-meeting` and otherwise falls back to proposed times saved via `submit-supplier-partnership`. Never use a Google Calendar viewer link, contractor `/book/:slug` or homeowner calendars. Why: no invented availability, booking or misattributed links.
