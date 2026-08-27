/**
 * UNPRO — « Comment ça fonctionne », affiché AVANT les forfaits.
 *
 * Étape 4 est rendue à partir de l'état réel de l'intégration
 * (src/lib/ai/chatgptIntegration.ts) : jamais présentée comme active si elle
 * ne l'est pas, jamais formulée comme une garantie de position dans ChatGPT.
 */
import { Brain, Compass, Layers, Sparkles } from "lucide-react";
import { chatgptIntegrationCopy } from "@/lib/ai/chatgptIntegration";

export function HowItWorksBlock({ lang = "fr" }: { lang?: "fr" | "en" }) {
  const integration = chatgptIntegrationCopy(lang);
  const fr = lang !== "en";

  const steps = [
    {
      Icon: Brain,
      text: fr
        ? "UNPRO comprend précisément ce que vous faites."
        : "UNPRO understands precisely what you do.",
    },
    {
      Icon: Layers,
      text: fr
        ? "Votre profil est structuré pour être compris par les assistants IA."
        : "Your profile is structured so AI assistants can understand it.",
    },
    {
      Icon: Compass,
      text: fr
        ? "Lorsqu'un projet compatible entre dans UNPRO, notre moteur peut vous considérer selon le service, le territoire, la disponibilité, les vérifications et la compatibilité."
        : "When a compatible project enters UNPRO, our engine can consider you based on service, territory, availability, verifications and compatibility.",
    },
    {
      Icon: Sparkles,
      text: integration.text,
      badge: integration.badge,
    },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">
        {fr ? "Comment ça fonctionne" : "How it works"}
      </h2>
      <ol className="mt-3 space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[12px] font-bold tabular-nums text-foreground">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] leading-relaxed text-foreground/85">{s.text}</p>
              {"badge" in s && s.badge && (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                  {fr ? "Statut de l'intégration" : "Integration status"} : {s.badge}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
        {fr
          ? "UNPRO ne vend pas de position ni de classement dans ChatGPT. Aucune plateforme d'IA ne garantit la visibilité d'une entreprise. UNPRO structure et vérifie votre profil pour vous rendre admissible aux recommandations UNPRO."
          : "UNPRO does not sell placement or ranking in ChatGPT. No AI platform guarantees a business's visibility. UNPRO structures and verifies your profile to make you eligible for UNPRO recommendations."}
      </p>
    </section>
  );
}
