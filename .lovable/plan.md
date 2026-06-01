# Contractor Intent Popup — "Parlez à un humain"

## Objective
When a visitor's intent is detected as "becoming a contractor", show a popup after 5 seconds inviting them to call a human at **(514) 249-9522**.

## Trigger logic
Show the popup once per session when ANY of the following is true:
- Route matches contractor surfaces: `/entrepreneur/*`, `/contractor/*`, `/aipp`, `/pro/*`, `/demo/isroyal-alex-plan-test`, contractor landing (`HomeContractorAdaptive`)
- `ActiveRoleContext` role = `contractor`
- Alex intent classifier returns `contractor_onboarding`
- URL has `?intent=contractor` or UTM `role=contractor`

Delay: **5000 ms** after the trigger condition is first met on the page.
Frequency cap: **once per tab session** (sessionStorage key `unpro:contractor_human_popup_shown`). Dismiss → no re-show this session.

## UX (premium, mobile-first)
- Centered modal, glass card (rgba(255,255,255,0.04) + blur 24px), radius 28px, master easing `cubic-bezier(.22,1,.36,1)` 420ms fade+scale.
- Title (FR): **"Vous voulez joindre UNPRO?"**
- Subtitle: **"Parlez à un humain maintenant."**
- Phone block: large tappable button **"Appeler (514) 249-9522"** → `tel:+15142499522`
- Secondary: **"Continuer avec Alex"** (closes popup, keeps current flow)
- Small dismiss "×" in top-right
- Trust micro-copy: "Lun–Ven · 8h–18h (HE)"
- No emojis. Inter font. Outcome-oriented copy. No mention of mechanics.

## Files

### New
- `src/components/contractor-intent/ContractorHumanCalloutModal.tsx` — modal UI (uses existing `Dialog` from shadcn).
- `src/hooks/useContractorHumanCallout.ts` — detects contractor intent + 5s timer + sessionStorage gate; exposes `{ isOpen, dismiss, call }`.
- `src/config/contractorHumanCallout.ts` — constants (phone, delay, surfaces, copy).

### Edited
- `src/app/App.tsx` (or root layout already mounting global overlays) — mount `<ContractorHumanCalloutModal />` once globally so it works across all contractor surfaces without per-page wiring.

## Logic detail
```
useEffect:
  if (sessionStorage.has(KEY)) return;
  if (!isContractorIntent(location, role, urlParams)) return;
  const t = setTimeout(() => setOpen(true), 5000);
  return () => clearTimeout(t);
```
On open: fire `trackCopilotEvent('contractor_human_callout_shown', { surface })`.
On call click: `trackCopilotEvent('contractor_human_callout_call_clicked')` then navigate `tel:`.
On dismiss: set sessionStorage, `trackCopilotEvent('contractor_human_callout_dismissed')`.

## Constraints
- No interference with Alex orb or auto-start (Alex remains the primary CTA). Popup is additive.
- Does not block scroll on dismiss.
- No new dependencies.
- Phone stored in config so it's editable in one place.
- Respects existing core rules: FR-CA, no Lovable mention, no emojis, premium tokens only.

## Success
- Popup appears exactly once, 5s after entering any contractor surface.
- Click-to-call works on iOS/Android (`tel:` link).
- Dismissal persists for the tab session.
- Zero impact on non-contractor surfaces.
