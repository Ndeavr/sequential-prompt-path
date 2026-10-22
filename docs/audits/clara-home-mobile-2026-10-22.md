# Clara homepage — targeted preview repair

## Scope and source
- Compared PR #28 read-only; retained newer editor code rather than replacing files or merging the PR.
- Source revision verified before this report: `b06f63716682e9a84a7f5e9f46ec88d852ebb896`.
- Changed: `HeroHomeownerLight.tsx`, `ClaraConversationBox.tsx`, `src/index.css`, three existing homepage/mobile regression files, and `roadmap.md`.
- Approved title, heading, greeting and placeholder implemented; repeated subtitle removed. Initial homeowner suggestions exclude contractor intents, with three homeowner defaults and English equivalents. Existing contractor flow retained.

## Checks actually executed
- Vitest: seven targeted files, **50/50 passed, exit 0**. Initial runs caught stale assertions for the replaced media menu, explicit homeowner context and retired mixed-persona suggestion; updated to current behavior and reran.
- Scoped ESLint: **exit 0**, zero errors; two existing fast-refresh export warnings.
- Harness compilation: newest observed entry `2026-10-22T18:49:51Z`, **build OK**. Manual build/typecheck not run under sandbox rules; standalone typecheck is not claimed.
- Browser real app at localhost: initial and focused screens at **360×800, 390×844, 430×932, 1280×1800**, **exit 0**. Input initially visible, three homeowner suggestions, no horizontal overflow, draft retained, zero page errors.
- At 390 px, simulated visualViewport height 480 px: composer remains inside visible height. Not a physical iOS/Android keyboard test.
- English 390 px: title/placeholder/suggestions and draft checked, **exit 0**.
- Synthetic restored contractor context at 390 px: homeowner greeting/suggestions absent and contractor composer present, **exit 0**. Contractor is already in its canonical flow, so initial contractor suggestion row is intentionally absent.
- Screenshots inspected for initial mobile/desktop and simulated keyboard. Services were intercepted; no hosted AI, voice, authenticated contractor journey or suggestion-to-real-AI response is claimed.

## QA caveat
The editor preview repeatedly reloaded during browser runs and erased draft inputs. Stabilized the QA browser only by intercepting the Vite client and suppressing `location.reload()`; app source/server unchanged. Final four-viewport run passed. An initial window-resize keyboard simulation triggered orientation handling, so the final test used visualViewport resize instead.

## Release
**NOT PUBLISHED.** No PR merge, deployment, Stripe/payment, database/RLS, outbound message, campaign or real customer mutation. Physical keyboards, live voice and a standalone typecheck remain unverified.