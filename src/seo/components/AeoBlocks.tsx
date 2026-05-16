/**
 * AeoBlocks — Renders AEO extraction blocks (Réponse rapide, En résumé,
 * Coût estimatif, Diagnostic fréquent, Signes visibles, Quand consulter)
 * and FAQs + FAQPage JSON-LD, loaded from aeo_extraction_blocks for the
 * current canonical URL. Silent no-op if no content has been generated yet.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Block {
  block_type: string;
  content_fr: string | null;
}

interface Faq { question: string; answer: string }

const LABELS: Record<string, string> = {
  reponse_rapide: "Réponse rapide",
  en_resume: "En résumé",
  cout_estimatif: "Coût estimatif",
  diagnostic_frequent: "Diagnostic fréquent",
  signes_visibles: "Signes visibles",
  quand_consulter: "Quand consulter un professionnel",
};

const ORDER = [
  "reponse_rapide",
  "en_resume",
  "cout_estimatif",
  "diagnostic_frequent",
  "signes_visibles",
  "quand_consulter",
];

export interface AeoBlocksProps {
  /** Canonical URL key used in aeo_extraction_blocks.page_url */
  pageUrl: string;
}

export default function AeoBlocks({ pageUrl }: AeoBlocksProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("aeo_extraction_blocks")
        .select("block_type, content_fr")
        .eq("page_url", pageUrl);
      if (cancelled || !data) return;
      setBlocks(data.filter((b) => b.block_type !== "faqs"));
      const f = data.find((b) => b.block_type === "faqs");
      if (f?.content_fr) {
        try { setFaqs(JSON.parse(f.content_fr) as Faq[]); } catch { /* noop */ }
      }
    })();
    return () => { cancelled = true; };
  }, [pageUrl]);

  if (blocks.length === 0 && faqs.length === 0) return null;

  const ordered = ORDER
    .map((t) => blocks.find((b) => b.block_type === t))
    .filter((b): b is Block => Boolean(b?.content_fr));

  return (
    <section className="space-y-6" aria-label="Intelligence locale">
      {ordered.length > 0 && (
        <div className="grid gap-3">
          {ordered.map((b) => (
            <div key={b.block_type} className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold tracking-tight text-foreground mb-1.5">
                {LABELS[b.block_type] ?? b.block_type}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {b.content_fr}
              </p>
            </div>
          ))}
        </div>
      )}

      {faqs.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold tracking-tight text-foreground mb-3">
            Questions fréquentes
          </h2>
          <div className="space-y-3">
            {faqs.map((q, i) => (
              <details key={i} className="group rounded-lg border border-border/60 p-3">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  {q.question}
                </summary>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{q.answer}</p>
              </details>
            ))}
          </div>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: faqs.map((f) => ({
                  "@type": "Question",
                  name: f.question,
                  acceptedAnswer: { "@type": "Answer", text: f.answer },
                })),
              }),
            }}
          />
        </div>
      )}
    </section>
  );
}
