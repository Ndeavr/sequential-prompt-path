# Compatibility Memory Engine — smoke test

## Prereqs
- Flag `compat_memory_engine_v1` = true (default).
- Signed-in homeowner.

## Steps
1. Open Alex (chat or voice) and send:
   > Oui j'ai deux chats et je préfère les textos en anglais.
2. Wait ~3 seconds.

## Expect
- `homeowner_memory_events` — new row with `scope='long_term'` and `extracted` containing pets + preferred_contact + language.
- `homeowner_compat_dna` — upserted with:
  - `environment.pets.cats = true`
  - `communication.preferred_channel = "sms"`
  - `communication.language = "en"`
- Next Alex turn does NOT re-ask preferred language or preferred contact.
- `/admin/memory-health` shows +1 event today and +1 DNA update today.
- On the matching results page, opening compatibility on a match writes a row into `recommendation_explanations` (visible in the admin KPI count).
