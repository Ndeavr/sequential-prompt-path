# src/config rules

- Founder meeting CTAs read only `founderBooking.ts` (validated https or null); when null they scroll to the in-page proposed-times request (`src/lib/founderMeetingSlots.ts`, saved via existing `submit-supplier-partnership`, confirmed later by UNPRO). Never use a Google Calendar viewer link, contractor `/book/:slug` or homeowner calendars. Why: no invented availability, booking or misattributed links.
