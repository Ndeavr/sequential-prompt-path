import { motion } from "framer-motion";
import {
  CheckCircle, AlertTriangle, Star, MapPin, Globe,
  Phone, Mail, Shield, BarChart3, ArrowRight
} from "lucide-react";
import type { SeedData } from "@/pages/recruitment/PageRepresentativeOnboarding";

interface Props {
  seed: SeedData;
  importedData: Record<string, any> | null;
  aippScore: number | null;
  onContinue: () => void;
}

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 70 ? "text-green-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", bounce: 0.4, delay: 0.3 }}
      className="flex flex-col items-center gap-1"
    >
      <div className={`text-4xl font-black ${color}`}>{score}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Score AIPP</div>
    </motion.div>
  );
}

export default function StepProfileReveal({ seed, importedData, aippScore, onContinue }: Props) {
  const data = importedData || {};
  const rating = data.rating?.value;
  const reviewCount = data.reviewCount?.value;
  const description = data.description?.value;

  const signals = [
    { label: "Nom entreprise", value: seed.business_name, status: "imported" },
    { label: "Site web", value: seed.website || data.website?.value, status: seed.website ? "imported" : data.website?.value ? "inferred" : "missing" },
    { label: "Téléphone", value: seed.phone || data.phone?.value, status: seed.phone ? "imported" : "missing" },
    { label: "Email", value: seed.email, status: seed.email ? "imported" : "missing" },
    { label: "RBQ", value: seed.rbq_number, status: seed.rbq_number ? "imported" : "missing" },
    { label: "NEQ", value: seed.neq_number, status: seed.neq_number ? "imported" : "missing" },
    { label: "Avis Google", value: reviewCount ? `${reviewCount} avis (${rating}★)` : null, status: reviewCount ? "imported" : "missing" },
    { label: "Description", value: description ? "Détectée" : null, status: description ? "imported" : "missing" },
  ];

  return (
    <div className="space-y-5">
      {/* Success banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 flex items-center gap-3"
      >
        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">Profil importé avec succès</p>
          <p className="text-xs text-muted-foreground">Score AIPP initial calculé</p>
        </div>
      </motion.div>

      {/* AIPP Score */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="rounded-2xl border border-border/40 bg-card p-6 text-center shadow-lg"
      >
        <h3 className="text-base font-bold text-foreground mb-1">{seed.business_name}</h3>
        {data.address?.value && (
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-4">
            <MapPin className="w-3 h-3" /> {data.address.value}
          </p>
        )}
        {aippScore !== null && <ScoreGauge score={aippScore} />}
        {rating && (
          <div className="flex items-center justify-center gap-1 mt-3 text-xs text-muted-foreground">
            <Star className="w-3 h-3 text-amber-400" /> {rating}/5 · {reviewCount} avis
          </div>
        )}
      </motion.div>

      {/* Proof signals */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Signaux détectés</h3>
        {signals.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.06 }}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30"
          >
            <span className="text-xs text-foreground">{s.label}</span>
            <div className="flex items-center gap-1.5">
              {s.value ? (
                <>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{s.value}</span>
                  {s.status === "imported" && <CheckCircle className="w-3 h-3 text-green-400" />}
                  {s.status === "inferred" && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                </>
              ) : (
                <span className="text-[10px] text-muted-foreground/50">Manquant</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onContinue}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-lg flex items-center justify-center gap-2"
      >
        Corriger et compléter <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
