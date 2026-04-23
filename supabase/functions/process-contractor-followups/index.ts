/**
 * UNPRO — Process Contractor Follow-ups
 * Cron-triggered edge function that sends follow-up emails
 * to contractors who dropped off without completing payment.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEMPLATES: Record<string, { subject: string; heading: string; body: string; cta: string }> = {
  "1h": {
    subject: "Besoin d'aide pour compléter votre profil?",
    heading: "On est là pour vous aider",
    body: "Vous étiez à quelques clics d'activer votre profil UNPRO. Notre équipe est disponible pour répondre à vos questions.",
    cta: "Reprendre mon inscription",
  },
  "24h": {
    subject: "Votre profil UNPRO vous attend",
    heading: "Votre profil est presque prêt",
    body: "Vous avez déjà complété une partie de votre profil. Reprenez là où vous en étiez et commencez à recevoir des demandes.",
    cta: "Compléter mon profil",
  },
  "3d": {
    subject: "Des contrats vous attendent",
    heading: "Des opportunités vous échappent",
    body: "Pendant que vous attendez, d'autres entrepreneurs dans votre zone reçoivent des demandes. Activez votre profil maintenant.",
    cta: "Activer mon profil maintenant",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get pending follow-ups that are due
    const { data: queue, error } = await supabase
      .from("contractor_followup_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(50);

    if (error) throw error;
    if (!queue || queue.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const item of queue) {
      const template = TEMPLATES[item.trigger_type];
      if (!template) continue;

      // Check if user already completed payment
      const { data: funnel } = await supabase
        .from("contractor_activation_funnel")
        .select("payment_status")
        .eq("user_id", item.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (funnel?.payment_status === "paid") {
        // Cancel remaining follow-ups
        await supabase
          .from("contractor_followup_queue")
          .update({ status: "cancelled" })
          .eq("user_id", item.user_id)
          .eq("status", "pending");
        continue;
      }

      // Send follow-up email via send-transactional-email if available
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: `contractor-followup-${item.trigger_type}`,
            recipientEmail: item.email,
            idempotencyKey: `followup-${item.id}`,
            templateData: {
              businessName: item.business_name || "Entrepreneur",
              subject: template.subject,
              heading: template.heading,
              body: template.body,
              cta: template.cta,
              resumeUrl: `https://unpro.ca/entrepreneur/activer`,
            },
          },
        });
      } catch (emailError) {
        console.warn(`[followup] Email send failed for ${item.id}:`, emailError);
      }

      // Mark as sent
      await supabase
        .from("contractor_followup_queue")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", item.id);

      processed++;
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[process-contractor-followups] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
