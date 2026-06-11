/**
 * SocialProofContractorBlock — 4 reasons entrepreneurs join UNPRO.
 * Light theme variant (sits over the unicorn home).
 */
import { Calendar, Brain, ShieldCheck, Cpu } from "lucide-react";

const cards = [
  {
    icon: Calendar,
    title: "Rendez-vous exclusifs",
    body: "Un propriétaire = une recommandation. Pas de course aux trois soumissions.",
  },
  {
    icon: Brain,
    title: "Compatibilité intelligente",
    body: "Nous analysons le projet avant la recommandation, jamais l'inverse.",
  },
  {
    icon: ShieldCheck,
    title: "Pas de compétition malsaine",
    body: "Nous ne vendons pas le même client à plusieurs entreprises.",
  },
  {
    icon: Cpu,
    title: "Intelligence propriétaire",
    body: "UNPRO comprend le projet avant même votre premier appel.",
  },
];

export default function SocialProofContractorBlock() {
  return (
    <section className="px-4 md:px-6 py-8 md:py-12">
      <div className="max-w-5xl mx-auto">
        <h2
          className="text-[20px] md:text-[26px] font-extrabold text-center mb-5 md:mb-7"
          style={{ color: "#0B1220", letterSpacing: "-0.02em" }}
        >
          Pourquoi les entrepreneurs rejoignent UNPRO
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {cards.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl p-4 md:p-5 border bg-white/85 backdrop-blur"
              style={{
                borderColor: "rgba(11,18,32,0.08)",
                boxShadow: "0 6px 14px -8px rgba(11,18,32,0.18)",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg, #2563FF, #3B82F6)",
                    color: "#fff",
                  }}
                >
                  <Icon size={18} strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <div
                    className="font-bold text-[14px] md:text-[15px]"
                    style={{ color: "#0B1220" }}
                  >
                    {title}
                  </div>
                  <p
                    className="text-[12.5px] md:text-[13px] mt-1 leading-relaxed"
                    style={{ color: "#475569" }}
                  >
                    {body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
