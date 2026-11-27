# UNPRO ChatGPT App — implementation contract (v0.1)

Goal: enable ChatGPT to find a verified Québec renovation contractor and request a real appointment through existing UNPRO/Clara systems. This is an integration contract, not a live ChatGPT app submission.

## Principles
- Reuse existing UNPRO database, matching logic and calendar availability; never create fake contractors, ratings, certifications, availability, or bookings.
- FR default, EN supported. Brand: UNPRO Rénovation – Construction.
- Homeowner intake: service, location, urgency, approximate budget, preferred dates, optional photos; max five relevant questions.
- Matching uses service, geographic coverage, verification (RBQ/CMMTQ/CMEQ where applicable), availability, language and compatibility. Prefer best match plus up to two alternatives.
- All writes require explicit homeowner approval. Never promise a booking until backend confirms it.
- Contractor personal contact data must be minimized and authorization enforced server-side.
- Attribute source=chatgpt_app separately from organic, Clara direct and paid ads.

## MCP tools (proposed)
1. search_contractors({service,city,postal_code?,language?,urgency?,budget_range?}) -> {matches:[{contractor_id,display_name,services,service_area,verification_status,match_reason}],request_id}
2. get_contractor_details({contractor_id}) -> public, verified fields only
3. get_appointment_slots({contractor_id,request_id,date_from,date_to,time_zone:"America/Toronto"}) -> {slots:[{slot_id,start_at,end_at}],expires_at}
4. create_booking({request_id,contractor_id,slot_id,homeowner:{name,email,phone?},consent:true,idempotency_key}) -> {status,booking_id?,confirmation_details?}
5. get_booking_status({booking_id}) -> {status,scheduled_at?}

## Delivery sequence
1. Audit existing Supabase schemas, matching RPCs, Google Calendar synchronization, authorization and booking workflow.
2. Add read-only endpoints for search/details/availability with schema validation, abuse limits, safe public contractor fields.
3. Implement booking with consent, idempotency, slot revalidation, audit log, notifications and rollback on failure.
4. Expose through authenticated HTTPS MCP server and add Apps SDK UI only if useful.
5. Validate French/English, absent matches, stale slots, unauthorized access, and booking race conditions.
6. Submit through OpenAI's current app review process. Listing/recommendation is not guaranteed.

## Definition of done
- A real Québec homeowner can request a relevant contractor, see grounded matches and live slots, explicitly approve booking, and receive a backend-confirmed appointment.
- No fabricated claims, duplicate bookings, or contractor data leakage.
- App review package includes privacy policy, support contact, screenshots, and data-use disclosure.
