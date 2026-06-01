// analyze-quote-comparative — Real AI analysis of 1-3 quote documents using Lovable AI Gateway
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InputFile {
  name: string;
  mimeType: string;
  base64: string; // raw base64 without data: prefix
}

interface ExtractedQuote {
  vendor: string | null;
  amount: number | null;
  warranty: string | null;
  inclusions: string[];
  exclusions: string[];
  risks: string[];
  has_insurance_mention: boolean;
  has_license_mention: boolean;
  completeness: number; // 0..1
}

const SYSTEM_PROMPT = `Tu es un analyste expert en soumissions de rénovation au Québec (français). Tu lis une soumission/devis et tu extrais des champs structurés. Reste factuel. Si une information est absente, retourne null ou tableau vide. Réponds UNIQUEMENT avec un objet JSON valide, sans markdown.`;

const USER_PROMPT = `Analyse ce document de soumission et retourne STRICTEMENT ce JSON:
{
  "vendor": string|null,                // nom de l'entrepreneur
  "amount": number|null,                // montant total en CAD (nombre, pas de symbole)
  "warranty": string|null,              // garantie offerte (ex: "10 ans")
  "inclusions": string[],               // ce qui est inclus
  "exclusions": string[],               // ce qui n'est PAS inclus
  "risks": string[],                    // risques/points faibles détectés
  "has_insurance_mention": boolean,     // mention d'assurance responsabilité
  "has_license_mention": boolean,       // mention RBQ ou licence
  "completeness": number                // 0..1, niveau de détail du scope
}`;

async function callGemini(file: InputFile): Promise<ExtractedQuote> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: USER_PROMPT },
            {
              type: "image_url",
              image_url: { url: `data:${file.mimeType};base64,${file.base64}` },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`gemini ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? "{}";
  let parsed: any = {};
  try {
    parsed = typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    parsed = {};
  }
  return {
    vendor: parsed.vendor ?? null,
    amount: typeof parsed.amount === "number" ? parsed.amount : null,
    warranty: parsed.warranty ?? null,
    inclusions: Array.isArray(parsed.inclusions) ? parsed.inclusions.slice(0, 10) : [],
    exclusions: Array.isArray(parsed.exclusions) ? parsed.exclusions.slice(0, 10) : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 8) : [],
    has_insurance_mention: !!parsed.has_insurance_mention,
    has_license_mention: !!parsed.has_license_mention,
    completeness: typeof parsed.completeness === "number" ? Math.max(0, Math.min(1, parsed.completeness)) : 0.5,
  };
}

function scoreQuote(q: ExtractedQuote, medianPrice: number | null): number {
  let s = 30;
  // Warranty parsing (years)
  const yrs = q.warranty ? parseInt(q.warranty.match(/\d+/)?.[0] ?? "0", 10) : 0;
  s += Math.min(20, yrs); // up to +20 for warranty
  if (q.has_insurance_mention) s += 8;
  if (q.has_license_mention) s += 10;
  s += Math.round(q.completeness * 15);
  s -= Math.min(15, q.risks.length * 4);
  if (medianPrice && q.amount) {
    const ratio = q.amount / medianPrice;
    if (ratio < 0.7) s -= 8; // too cheap
    else if (ratio > 1.25) s -= 6; // too expensive
    else s += 6;
  }
  return Math.max(10, Math.min(100, s));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { files } = (await req.json()) as { files: InputFile[] };
    if (!Array.isArray(files) || files.length < 1 || files.length > 3) {
      return new Response(JSON.stringify({ error: "1 à 3 fichiers requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Run extractions in parallel
    const extracted = await Promise.all(files.map((f) => callGemini(f).catch((e) => {
      console.error("extract fail", e);
      return null;
    })));

    const quotes = extracted
      .map((q, i) => ({ q, i }))
      .filter((x) => x.q !== null) as { q: ExtractedQuote; i: number }[];

    if (quotes.length === 0) {
      return new Response(JSON.stringify({ error: "Impossible d'analyser les documents fournis" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amounts = quotes.map((x) => x.q.amount).filter((v): v is number => typeof v === "number" && v > 0);
    const median = amounts.length > 0
      ? amounts.slice().sort((a, b) => a - b)[Math.floor(amounts.length / 2)]
      : null;

    const scored = quotes.map((x, idx) => {
      const score = scoreQuote(x.q, median);
      return {
        slot: idx + 1,
        vendor: x.q.vendor ?? `Soumission ${idx + 1}`,
        amount: x.q.amount,
        warranty: x.q.warranty,
        score,
        inclusions: x.q.inclusions,
        exclusions: x.q.exclusions,
        risks: x.q.risks,
        isBestValue: false,
      };
    });

    // Best value = highest score (tiebreaker lower price)
    let best = scored[0];
    for (const q of scored) {
      if (q.score > best.score || (q.score === best.score && (q.amount ?? Infinity) < (best.amount ?? Infinity))) {
        best = q;
      }
    }
    best.isBestValue = true;

    const confidenceScore = Math.round(
      scored.reduce((a, b) => a + b.score, 0) / scored.length,
    );

    const recommendation = `Soumission de ${best.vendor} — meilleur rapport qualité-prix${
      best.warranty ? ` avec garantie ${best.warranty}` : ""
    }${best.amount ? ` à ${best.amount.toLocaleString("fr-CA")} $` : ""}.`;

    // Derive cross-quote intelligence (scope gaps, price anomalies, questions)
    const allInclusions = new Set<string>();
    scored.forEach((q) => q.inclusions.forEach((i) => allInclusions.add(i.toLowerCase())));
    const scopeGaps: string[] = [];
    scored.forEach((q) => {
      const missing = [...allInclusions].filter(
        (inc) => !q.inclusions.some((i) => i.toLowerCase() === inc),
      );
      missing.slice(0, 2).forEach((m) =>
        scopeGaps.push(`${q.vendor} n'inclut pas: ${m}`),
      );
    });

    const priceAnomalies: string[] = [];
    if (median) {
      scored.forEach((q) => {
        if (!q.amount) return;
        const ratio = q.amount / median;
        if (ratio < 0.75) priceAnomalies.push(`${q.vendor} est ${Math.round((1 - ratio) * 100)}% sous la médiane — vérifier le scope.`);
        else if (ratio > 1.25) priceAnomalies.push(`${q.vendor} est ${Math.round((ratio - 1) * 100)}% au-dessus de la médiane.`);
      });
    }

    const homeownerQuestions: string[] = [];
    scored.forEach((q) => {
      if (!q.warranty) homeownerQuestions.push(`Quelle garantie offre ${q.vendor}?`);
      if (q.exclusions.length > 0) homeownerQuestions.push(`Pourquoi ${q.vendor} exclut: ${q.exclusions[0]}?`);
    });

    const payload = {
      quotes: scored,
      recommendation,
      confidenceScore,
      scopeGaps: scopeGaps.slice(0, 5),
      priceAnomalies: priceAnomalies.slice(0, 4),
      homeownerQuestions: [...new Set(homeownerQuestions)].slice(0, 5),
    };

    // Persist
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await supa
      .from("quote_analyses")
      .insert({ payload, file_count: files.length })
      .select("id")
      .single();

    if (error) {
      console.error("persist fail", error);
      return new Response(JSON.stringify({ error: "Persistence failed", payload }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ analysis_id: data.id, payload }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-quote-comparative", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
