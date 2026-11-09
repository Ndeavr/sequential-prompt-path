# Clara services rules

- Clara form-filling on `/entrepreneur/devis-personnalise` reuses `ClaraFormAssistant` + `ClaraConversationBox` (`formIntake`) via `src/services/clara/claraFormIntake.ts`; it reads the live form draft each turn, writes only the fields it just filled, mirrors declared answers to the canonical qualification store, and never submits or confirms on its own. Why: one Clara session, no overwrite of unsaved typing, declared ≠ verified.
- Clara appointment times come only from `computeSlotsFromData` (`src/services/bookingSlotEngine.ts`, America/Toronto), the same source as /book; `claraBookingSlots.ts` limits them to verified_active businesses and Clara never confirms a booking. Why: one availability truth, no invented times.
