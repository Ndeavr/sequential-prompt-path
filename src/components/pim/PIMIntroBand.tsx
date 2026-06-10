/**
 * PIMIntroBand — bandeau d'introduction PIM injecté en haut de la homepage existante.
 * Conserve l'identité unicorn-theme (glass clair) tout en introduisant la nouvelle
 * proposition de valeur PIM. Lien vers /pim pour le full storytelling.
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export default function PIMIntroBand() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="px-4 pt-2"
    >
      <Link
        to="/pim"
        className="uc-glass-strong block rounded-3xl p-4 sm:p-5 hover:-translate-y-0.5 transition-transform duration-[420ms]"
        style={{
          borderRadius: 22,
          background:
            "linear-gradient(135deg, rgba(37,99,255,0.06), rgba(99,102,241,0.05))",
          border: "1px solid rgba(37,99,255,0.18)",
        }}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #2563FF, #6366F1)",
              boxShadow: "0 8px 20px -6px rgba(37,99,255,0.45)",
            }}
          >
            <Sparkles size={20} color="white" strokeWidth={2.2} />
          </div>

          <div className="min-w-0 flex-1">
            <div
              className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-0.5"
              style={{ color: "#2563FF" }}
            >
              Nouveau · Passeport Maison
            </div>
            <div
              className="text-[14px] sm:text-[15px] font-bold leading-tight"
              style={{ color: "#0B1220" }}
            >
              Votre maison possède désormais sa propre mémoire.
            </div>
            <div
              className="text-[11.5px] sm:text-[12.5px] mt-0.5 leading-snug line-clamp-2"
              style={{ color: "#64748B" }}
            >
              Conservez rénovations, garanties, inspections, soumissions et documents importants au même endroit.
            </div>
          </div>

          <ArrowRight
            size={18}
            className="shrink-0"
            color="#2563FF"
            strokeWidth={2.2}
          />
        </div>
      </Link>
    </motion.section>
  );
}
