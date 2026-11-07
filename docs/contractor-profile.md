# UNPRO — Contractor Profile

> This document defines the contractor profile system — how contractors are represented, verified, and scored on the platform.

## Purpose

Contractor profiles are the foundation of trust on UNPRO. They display credentials, work history, reviews, and AIPP-derived quality scores.

## Planned Sections

- **Profile Fields** — Name, license, insurance, specialties, service area, portfolio
- **Verification Flow** — Document upload, admin review, badge system
- **Scoring** — AIPP contractor score based on quote accuracy, review sentiment, response time
- **Public vs Private Data** — What homeowners see vs what admins manage
- **Search & Discovery** — How homeowners find and filter contractors

---

_This file will be expanded as the contractor system is designed._

## Existing website-first entry — focused completion, 2026-11-07

- `/entrepreneurs` accepts a public website or a business-name fallback and enters `/entrepreneurs/profil?entry=profile`; FR/EN use `unpro-lang` storage and `lang` query.
- The existing `matching-profile` workflow persists the editable name, website and progressive matching answers. Identity provenance remains `declared`; no paid enrichment is called and no licence is automatically verified.
- Existing saved identity takes precedence. If an authenticated company has no matching draft, its name is read before explicit review instead of silently adopting the incoming URL name. Failed lookup blocks review; failed saves retain edits and allow another attempt without reloading.
- Completion reuses free-service entitlement verification and activation resumption. The base offer describes CAD350 plus taxes once for the profile and 12 months; promotions and actual appointment entitlements are confirmed in the existing offer/checkout. Free membership goes to its included calendar rather than paid activation.
- A compact official-logo header is used only in simple entry; the existing audit header and homeowner routes are unchanged. No schema, auth, pricing, Stripe, backend or service changes.

### Actual local validation

Source baseline: `ee9654076f30ab7691fb6fbf13a9a3e75e55193d`, including original entry `eb6f9c6734c65e1b09a332aff4898ac50103ae2f`; `verify:source` passed. Subsequent campaign work preserved.

- Six focused Vitest files: **36/36 passed** (entry normalization/identity, matching auth recovery, activation resume, entry350 contract/taxes, founder entitlement continuity).
- Three synthetic browser journeys, 360×800, explicit fr-CA/en-CA locale and language storage set on localhost before target navigation: FR website, EN name fallback with an authenticated synthetic company, FR active-free membership.
- All three passed: invalid input, editable draft, one failed save plus retry without losing edits, save/reload, all nine matching questions, declared provenance, zero horizontal overflow on landing/draft/questions/completion, no uncaught app exceptions. FR/EN activation handoffs retained language, affiliate reference, campaign and promotion code; free membership reached `/calendar/connect` and hid the base paid offer.
- Browser screenshots inspected with real CSS. Development-only Vite reload polling was isolated in the browser adapter (style injection retained); no project development settings changed. All external requests, backend writes and Stripe were intercepted, with synthetic sessions only. No production data access/mutation, enrichment, contact or payment.
- Automatic compilation reported `build OK`; no manual build/typecheck was run. Hosted auth, actual promotion eligibility, Checkout/payment/webhook and physical devices were deliberately not exercised and remain unverified. Nothing published.

Reproduction script and outputs: `/tmp/browser/contractor-entry/check_entry.py`, `results.txt`, `unit-results.txt` (temporary sandbox evidence, not durable deployment evidence).
- Clara workspace v1 extension: see `docs/clara-contractor-workspace.md`.
