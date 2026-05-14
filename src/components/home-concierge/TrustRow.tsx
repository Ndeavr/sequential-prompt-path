/**
 * TrustRow — Three believable trust signals (no fake metrics).
 */
import { ShieldCheck, Scale, Ban } from "lucide-react";

const items = [
  {
    icon: ShieldCheck,
    title: "Entrepreneurs vérifiés",
    body: "Chaque pro validé manuellement (RBQ, assurances, références).",
  },
  {
    icon: Scale,
    title: "Une seule recommandation",
    body: "Pas de magasinage. Alex choisit le bon pro pour vous.",
  },
  {
    icon: Ban,
    title: "Aucun spam de soumissions",
    body: "Vos coordonnées ne sont jamais partagées à plusieurs entreprises.",
  },
];

export default function TrustRow() {
  return (
    <ul className="mt-5 space-y-2">
      {items.map(({ icon: Icon, title, body }) => (
        <li
          key={title}
          className="flex items-start gap-3 rounded-2xl bg-white border border-[#0F1B2D]/10 px-4 py-3 shadow-[0_1px_0_rgba(15,27,45,0.04)]"
        >
          <span className="mt-0.5 inline-flex w-8 h-8 shrink-0 items-center justify-center rounded-full bg-[#0E5E4E]/10 text-[#0E5E4E]">
            <Icon className="w-4 h-4" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 text-left">
            <p className="text-[#0F1B2D] text-sm font-semibold leading-tight">{title}</p>
            <p className="text-[#0F1B2D]/60 text-xs mt-0.5 leading-snug">{body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
