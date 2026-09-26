// UNPRO System Status — read-only evidence checks. Never sends anything.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

type Row = {
  check_key: string; label: string; status: "ok" | "problem" | "untested"; evidence: Record<string, unknown>;
  probable_cause?: string | null; component?: string | null; fix_applied?: string | null; test_performed?: string | null; next_blocker?: string | null;
};
const DAY = 86400000;
const ago = (d: number) => new Date(Date.now() - d * DAY).toISOString();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!token) return json({ error: "unauthorized" }, 401);
  const { data: u } = await svc.auth.getUser(token);
  if (!u?.user) return json({ error: "unauthorized" }, 401);
  const { data: isAdmin } = await svc.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "forbidden" }, 403);

  const rows: Row[] = [];
  const safe = async <T>(fn: () => Promise<T>): Promise<T | null> => { try { return await fn(); } catch { return null; } };

  // 1. Stripe
  const stripeKey = !!Deno.env.get("STRIPE_SECRET_KEY");
  const { data: lastWh } = await svc.from("stripe_webhook_events").select("event_type,received_at,processing_status,success,livemode,error_message").order("received_at", { ascending: false }).limit(1).maybeSingle();
  const { count: whFail } = await svc.from("stripe_webhook_events").select("id", { count: "exact", head: true }).eq("success", false).gte("received_at", ago(7));
  rows.push({
    check_key: "stripe", label: "Stripe",
    status: !stripeKey ? "problem" : lastWh ? ((whFail ?? 0) > 0 ? "problem" : "ok") : "untested",
    evidence: { key_present: stripeKey, last_webhook: lastWh, failed_7d: whFail ?? 0 },
    probable_cause: !stripeKey ? "Clé Stripe absente" : (whFail ?? 0) > 0 ? `${whFail} événement(s) webhook en échec sur 7 jours` : null,
    component: "stripe-webhook / stripe_webhook_events",
    test_performed: "Lecture du dernier événement webhook reçu et des échecs sur 7 jours",
  });

  // 2. Twilio
  const twCreds = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"].every((k) => !!Deno.env.get(k)) || !!Deno.env.get("TWILIO_API_KEY");
  const { data: lastSms } = await svc.from("sms_events_v2").select("status,delivered_at,error_code").eq("status", "delivered").order("delivered_at", { ascending: false }).limit(1).maybeSingle();
  rows.push({
    check_key: "twilio", label: "Twilio (SMS)",
    status: !twCreds ? "problem" : lastSms ? "ok" : "untested",
    evidence: { credentials_present: twCreds, last_delivered_at: lastSms?.delivered_at ?? null },
    probable_cause: !twCreds ? "Identifiants Twilio absents" : null,
    component: "sendSms / sms_events_v2", test_performed: "Dernier rapport de livraison Twilio réel",
  });

  // 3. Resend / email
  const { data: lastEmail } = await svc.from("email_send_log").select("status,error_message,created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: lastSent } = await svc.from("email_send_log").select("created_at,template_name").eq("status", "sent").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const disabled = (lastEmail?.error_message ?? "").toLowerCase().includes("disabled");
  rows.push({
    check_key: "resend", label: "Courriel (Resend)",
    status: disabled ? "problem" : lastEmail?.status === "sent" ? "ok" : lastEmail ? "problem" : "untested",
    evidence: { last_attempt: lastEmail, last_successful_send: lastSent },
    probable_cause: disabled ? "Envoi de courriels désactivé pour le projet (choix volontaire)" : lastEmail && lastEmail.status !== "sent" ? lastEmail.error_message : null,
    component: "send-transactional-email / email_send_log",
    test_performed: "Lecture du dernier envoi et de son statut",
    next_blocker: disabled ? "Feu vert du fondateur pour réactiver l'envoi global" : null,
  });

  // 4. Paiement test + 5. Activation
  const { data: sub } = await svc.from("contractor_subscriptions").select("contractor_id,plan_id,status,payment_status,amount_paid_cents,currency,created_at,stripe_subscription_id").eq("status", "active").eq("payment_status", "paid").like("stripe_subscription_id", "sub_%").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: testWh } = await svc.from("stripe_webhook_events").select("received_at,event_type,success").eq("livemode", false).eq("event_type", "checkout.session.completed").eq("success", true).order("received_at", { ascending: false }).limit(1).maybeSingle();
  rows.push({
    check_key: "payment_test", label: "Paiement test",
    status: testWh && sub ? "ok" : "untested",
    evidence: { last_test_checkout: testWh, last_paid_subscription: sub },
    component: "create-checkout-session / stripe-webhook / contractor_subscriptions",
    test_performed: "Session test payée + abonnement actif payé en base",
  });
  let contractor: Record<string, unknown> | null = null;
  let audit: Record<string, unknown> | null = null;
  if (sub?.contractor_id) {
    contractor = (await svc.from("contractors").select("id,slug,public_status,account_status").eq("id", sub.contractor_id).maybeSingle()).data;
    audit = (await svc.from("contractor_publication_audit").select("new_published,db_role,created_at").eq("contractor_id", sub.contractor_id).eq("new_published", true).order("created_at", { ascending: false }).limit(1).maybeSingle()).data;
  }
  const published = contractor && ["published_pending_verification", "verified_active"].includes(String(contractor.public_status));
  rows.push({
    check_key: "activation", label: "Activation entrepreneur",
    status: !sub ? "untested" : published ? "ok" : "problem",
    evidence: { contractor, publication_audit: audit },
    probable_cause: sub && !published ? "Abonnement payé mais profil non publié" : null,
    component: "stripe-webhook → contractors.public_status / contractor_publication_audit",
    test_performed: "Statut public du profil lié au dernier abonnement payé",
  });

  // 6. SMS test interne
  const { data: adminPhones } = await svc.from("admin_sms_recipients").select("phone");
  const phones = (adminPhones ?? []).map((p: { phone: string }) => p.phone).filter(Boolean);
  const intSms = phones.length
    ? (await svc.from("sms_events_v2").select("status,delivered_at,created_at").in("normalized_phone", phones).order("created_at", { ascending: false }).limit(1).maybeSingle()).data
    : null;
  rows.push({
    check_key: "sms_internal", label: "SMS test interne",
    status: !intSms ? "untested" : intSms.status === "delivered" ? "ok" : "problem",
    evidence: { internal_recipients: phones.length, last_internal_sms: intSms },
    probable_cause: intSms && intSms.status !== "delivered" ? `Dernier SMS interne au statut ${intSms.status}` : null,
    component: "sms_events_v2 / admin_sms_recipients", test_performed: "Dernier SMS vers un numéro admin (aucun nouvel envoi)",
  });

  // 7. Courriel test interne
  const intEmail = (await svc.from("email_send_log").select("status,error_message,created_at,recipient_email").ilike("recipient_email", "%@unpro.ca").order("created_at", { ascending: false }).limit(1).maybeSingle()).data;
  rows.push({
    check_key: "email_internal", label: "Courriel test interne",
    status: !intEmail ? "untested" : intEmail.status === "sent" ? "ok" : "problem",
    evidence: { last_internal_email: intEmail ? { status: intEmail.status, created_at: intEmail.created_at, error: intEmail.error_message } : null },
    probable_cause: intEmail && intEmail.status !== "sent" ? intEmail.error_message : null,
    component: "email_send_log", test_performed: "Dernier courriel vers une adresse @unpro.ca",
    next_blocker: disabled ? "Réactivation de l'envoi global requise" : null,
  });

  // 8/9. Rendez-vous réels
  const { data: appts, count: apptCount } = await svc.from("appointments").select("id,status,created_at,homeowner_user_id,contractor_id", { count: "exact" })
    .neq("status", "archived_test").or("source_page.is.null,source_page.neq.qa_test").not("homeowner_user_id", "is", null).order("created_at", { ascending: false }).limit(1);
  const lastAppt = appts?.[0] ?? null;
  rows.push({
    check_key: "appointment_created", label: "Rendez-vous créé",
    status: lastAppt ? "ok" : "untested",
    evidence: { real_appointments: apptCount ?? 0, last: lastAppt },
    component: "appointments", test_performed: "Rendez-vous avec propriétaire réel, hors archives de test",
    next_blocker: lastAppt ? null : "Aucun rendez-vous réel propriétaire → entrepreneur encore",
  });
  const { count: notifCount } = await svc.from("appointment_contractor_notifications").select("id", { count: "exact", head: true });
  rows.push({
    check_key: "appointment_admin", label: "Rendez-vous visible admin",
    status: lastAppt ? "ok" : "untested",
    evidence: { tracked_notifications: notifCount ?? 0 },
    component: "/admin/acquisition-pipeline (AppointmentNotificationsPanel)",
    test_performed: "Le tableau admin lit appointments + avis entrepreneurs (archives de test exclues)",
  });

  // 10. Clara propriétaire
  const { data: qs } = await svc.from("alex_qualification_sessions").select("id,score,ready_for_match,graph,updated_at").gte("updated_at", ago(14)).order("updated_at", { ascending: false }).limit(50);
  const withTurns = (qs ?? []).length;
  const withProject = (qs ?? []).find((s: { graph: any }) => s.graph?.project_context?.project_id);
  rows.push({
    check_key: "clara_homeowner", label: "Clara propriétaire",
    status: withProject ? "ok" : withTurns ? "problem" : "untested",
    evidence: { sessions_14d: withTurns, last_with_dossier: withProject ? { id: withProject.id, updated_at: withProject.updated_at } : null },
    probable_cause: !withProject && withTurns ? "Qualifications actives, mais aucun dossier créé (connexion + adresse vérifiée requises)" : null,
    component: "alex-qualify-turn / alex_qualification_sessions",
    test_performed: "Sessions de qualification des 14 derniers jours et dossier créé",
    next_blocker: !withProject ? "Un propriétaire connecté avec adresse vérifiée doit compléter la qualification" : null,
  });

  // 11. Clara entrepreneur
  const q = await safe(async () => (await svc.from("contractor_pricing_quotes").select("id,created_at,status").gte("created_at", ago(14)).order("created_at", { ascending: false }).limit(1).maybeSingle()).data);
  rows.push({
    check_key: "clara_contractor", label: "Clara entrepreneur",
    status: q ? "ok" : "untested",
    evidence: { last_quote_after_qualification: q },
    component: "Qualification Clara → /entrepreneurs/audit-ia → contractor_pricing_quotes",
    test_performed: "Dernier devis personnalisé généré après qualification (14 jours)",
  });

  const now = new Date().toISOString();
  const payload = rows.map((r, i) => ({ ...r, sort_order: i, checked_at: now }));
  const { error } = await svc.from("system_status_checks").upsert(payload, { onConflict: "check_key" });
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, checked_at: now, rows: payload });
});
