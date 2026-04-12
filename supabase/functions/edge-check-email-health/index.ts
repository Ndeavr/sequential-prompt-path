const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { domain, from_email, reply_to, provider } = await req.json();
    if (!domain) {
      return new Response(JSON.stringify({ error: "domain is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim().toLowerCase();

    // DNS lookups via Cloudflare DoH
    const [spfResult, dmarcResult, dkimResult] = await Promise.all([
      fetchDNS(cleanDomain, "TXT"),
      fetchDNS(`_dmarc.${cleanDomain}`, "TXT"),
      fetchDKIM(cleanDomain),
    ]);

    // Analyze SPF
    const spfAnalysis = analyzeSPF(spfResult);
    // Analyze DMARC
    const dmarcAnalysis = analyzeDMARC(dmarcResult);
    // Analyze DKIM
    const dkimAnalysis = analyzeDKIM(dkimResult);
    // Analyze alignment
    const alignmentAnalysis = analyzeAlignment(cleanDomain, from_email, spfAnalysis, dkimAnalysis, dmarcAnalysis);

    // Compute scores
    const authScore = computeAuthScore(spfAnalysis, dkimAnalysis, dmarcAnalysis);
    const alignmentScore = alignmentAnalysis.pass ? 100 : 30;
    const reputationScore = 70; // baseline without blacklist API
    const behaviorScore = 70;
    const contentScore = 80;

    const overallScore = Math.round(
      authScore * 0.4 +
      alignmentScore * 0.2 +
      reputationScore * 0.15 +
      behaviorScore * 0.15 +
      contentScore * 0.1
    );

    const level = overallScore >= 90 ? "excellent" : overallScore >= 75 ? "bon" : overallScore >= 55 ? "moyen" : overallScore >= 35 ? "faible" : "critique";

    // Build issues and recommendations
    const issues: any[] = [];
    const recommendations: any[] = [];

    if (spfAnalysis.status === "missing") {
      issues.push({ type: "CRITICAL", code: "spf_missing", message: "Aucun enregistrement SPF trouvé" });
      recommendations.push({
        issue_type: "spf_missing", severity: "critical",
        title: "Ajouter un enregistrement SPF",
        description: "Votre domaine n'a pas de record SPF. Les serveurs email ne peuvent pas vérifier que vos emails sont légitimes.",
        impact: "Emails probablement rejetés ou classés spam",
        fix_instructions: `Ajoutez un enregistrement TXT à votre DNS`,
        dns_record_to_add: `v=spf1 include:_spf.google.com ~all`,
      });
    } else if (spfAnalysis.status === "invalid") {
      issues.push({ type: "WARNING", code: "spf_invalid", message: `Problème SPF : ${spfAnalysis.issues.join(", ")}` });
    }

    if (dkimAnalysis.status === "missing") {
      issues.push({ type: "CRITICAL", code: "dkim_missing", message: "Aucun enregistrement DKIM détecté" });
      recommendations.push({
        issue_type: "dkim_missing", severity: "critical",
        title: "Configurer DKIM",
        description: "DKIM permet de signer vos emails cryptographiquement pour prouver leur authenticité.",
        impact: "Risque élevé de classification spam",
        fix_instructions: "Activez DKIM dans votre fournisseur email et ajoutez le record CNAME/TXT fourni.",
        dns_record_to_add: "Consultez votre fournisseur email pour le record DKIM exact.",
      });
    }

    if (dmarcAnalysis.status === "missing") {
      issues.push({ type: "CRITICAL", code: "dmarc_missing", message: "Aucun enregistrement DMARC trouvé" });
      recommendations.push({
        issue_type: "dmarc_missing", severity: "critical",
        title: "Ajouter un enregistrement DMARC",
        description: "DMARC protège votre domaine contre l'usurpation d'identité (spoofing).",
        impact: "Vulnérable au spoofing, livraison dégradée",
        fix_instructions: "Ajoutez un enregistrement TXT _dmarc à votre DNS.",
        dns_record_to_add: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${cleanDomain}; fo=1`,
      });
    } else if (dmarcAnalysis.policy === "none") {
      issues.push({ type: "WARNING", code: "dmarc_permissive", message: "DMARC policy est 'none' — pas de protection active" });
      recommendations.push({
        issue_type: "dmarc_permissive", severity: "warning",
        title: "Renforcer votre politique DMARC",
        description: "Votre politique DMARC est en mode observation (none). Passez à quarantine ou reject.",
        impact: "Protection limitée contre le spoofing",
        fix_instructions: `Modifiez votre record DMARC pour utiliser p=quarantine ou p=reject`,
        dns_record_to_add: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${cleanDomain}; fo=1`,
      });
    }

    if (!alignmentAnalysis.pass) {
      issues.push({ type: "WARNING", code: "alignment_fail", message: "L'alignement domaine From/SPF/DKIM est incohérent" });
    }

    // Save to Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Upsert domain config
    const { data: config } = await supabase
      .from("email_domain_configs")
      .upsert({ domain: cleanDomain, from_email, reply_to, provider, health_score: overallScore, updated_at: new Date().toISOString() }, { onConflict: "domain" })
      .select("id")
      .single();

    if (config) {
      await Promise.all([
        supabase.from("email_authentication_checks").insert({
          domain_config_id: config.id,
          spf_status: spfAnalysis.status,
          spf_record: spfAnalysis.record,
          spf_issues: spfAnalysis.issues,
          dkim_status: dkimAnalysis.status,
          dkim_record: dkimAnalysis.record,
          dkim_selector: dkimAnalysis.selector,
          dkim_issues: dkimAnalysis.issues,
          dmarc_status: dmarcAnalysis.status,
          dmarc_record: dmarcAnalysis.record,
          dmarc_policy: dmarcAnalysis.policy,
          dmarc_issues: dmarcAnalysis.issues,
          alignment_status: alignmentAnalysis.pass ? "pass" : "fail",
          alignment_details: alignmentAnalysis,
        }),
        supabase.from("email_health_reports").insert({
          domain_config_id: config.id,
          overall_score: overallScore,
          auth_score: authScore,
          alignment_score: alignmentScore,
          reputation_score: reputationScore,
          behavior_score: behaviorScore,
          content_score: contentScore,
          level,
          issues,
          recommendations,
        }),
        // Save fix recommendations
        ...recommendations.map((r: any) =>
          supabase.from("email_fix_recommendations").insert({
            domain_config_id: config.id,
            issue_type: r.issue_type,
            severity: r.severity,
            title: r.title,
            description: r.description,
            impact: r.impact,
            fix_instructions: r.fix_instructions,
            dns_record_to_add: r.dns_record_to_add,
          })
        ),
      ]);
    }

    return new Response(JSON.stringify({
      domain: cleanDomain,
      overall_score: overallScore,
      level,
      auth_score: authScore,
      alignment_score: alignmentScore,
      reputation_score: reputationScore,
      behavior_score: behaviorScore,
      content_score: contentScore,
      spf: spfAnalysis,
      dkim: dkimAnalysis,
      dmarc: dmarcAnalysis,
      alignment: alignmentAnalysis,
      issues,
      recommendations,
      domain_config_id: config?.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── DNS Helpers ───
async function fetchDNS(name: string, type: string): Promise<any> {
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, {
      headers: { Accept: "application/dns-json" },
    });
    return await res.json();
  } catch {
    return { Answer: [] };
  }
}

async function fetchDKIM(domain: string): Promise<any> {
  const selectors = ["google", "default", "selector1", "selector2", "k1", "s1", "dkim", "mail"];
  for (const sel of selectors) {
    const result = await fetchDNS(`${sel}._domainkey.${domain}`, "TXT");
    if (result?.Answer?.length) {
      return { ...result, selector: sel };
    }
  }
  return { Answer: [], selector: null };
}

// ─── Analysis ───
function analyzeSPF(dns: any) {
  const records = (dns?.Answer || [])
    .map((a: any) => a.data?.replace(/"/g, ""))
    .filter((d: string) => d?.startsWith("v=spf1"));

  if (!records.length) return { status: "missing", record: null, issues: ["Aucun record SPF trouvé"] };
  if (records.length > 1) return { status: "invalid", record: records[0], issues: ["Plusieurs records SPF détectés — un seul autorisé"] };

  const record = records[0];
  const issues: string[] = [];
  const includes = (record.match(/include:/g) || []).length;
  if (includes > 10) issues.push("Trop de lookups DNS (>10)");
  if (!record.includes("~all") && !record.includes("-all")) issues.push("Pas de mécanisme all — ajoutez ~all ou -all");

  return {
    status: issues.length ? "warning" : "pass",
    record,
    issues,
    includes_count: includes,
  };
}

function analyzeDMARC(dns: any) {
  const records = (dns?.Answer || [])
    .map((a: any) => a.data?.replace(/"/g, ""))
    .filter((d: string) => d?.startsWith("v=DMARC1"));

  if (!records.length) return { status: "missing", record: null, policy: null, issues: ["Aucun record DMARC trouvé"] };

  const record = records[0];
  const policyMatch = record.match(/p=(\w+)/);
  const policy = policyMatch?.[1] || "unknown";
  const issues: string[] = [];
  if (policy === "none") issues.push("Policy trop permissive (none)");
  if (!record.includes("rua=")) issues.push("Pas d'adresse de reporting (rua)");

  return { status: issues.length ? "warning" : "pass", record, policy, issues };
}

function analyzeDKIM(dns: any) {
  const records = (dns?.Answer || []).map((a: any) => a.data?.replace(/"/g, ""));
  const selector = dns?.selector;

  if (!records.length || !selector) return { status: "missing", record: null, selector: null, issues: ["Aucun DKIM trouvé sur les sélecteurs courants"] };

  return { status: "pass", record: records[0], selector, issues: [] };
}

function analyzeAlignment(domain: string, fromEmail: string | undefined, spf: any, dkim: any, dmarc: any) {
  const fromDomain = fromEmail ? fromEmail.split("@")[1]?.toLowerCase() : domain;
  const spfAligned = spf.status !== "missing" && fromDomain === domain;
  const dkimAligned = dkim.status !== "missing" && fromDomain === domain;

  return {
    pass: spfAligned || dkimAligned,
    from_domain: fromDomain,
    envelope_domain: domain,
    spf_aligned: spfAligned,
    dkim_aligned: dkimAligned,
  };
}

function computeAuthScore(spf: any, dkim: any, dmarc: any): number {
  let score = 0;
  if (spf.status === "pass") score += 35;
  else if (spf.status === "warning") score += 20;
  if (dkim.status === "pass") score += 35;
  if (dmarc.status === "pass") score += 30;
  else if (dmarc.status === "warning") score += 15;
  return Math.min(score, 100);
}
