import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Star } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Row {
  feature: string;
  directories: boolean | string;
  sharedLeads: boolean | string;
  unpro: boolean | string;
  /** When true, false=good for UNPRO (inverted logic) */
  invertUnpro?: boolean;
}

const ROWS: Row[] = [
  { feature: "Profil entreprise", directories: true, sharedLeads: true, unpro: true },
  { feature: "Avis clients", directories: true, sharedLeads: "Parfois", unpro: true },
  { feature: "Visibilité locale", directories: true, sharedLeads: "Limitée", unpro: true },
  { feature: "Rendez-vous garantis", directories: false, sharedLeads: "Parfois", unpro: true },
  { feature: "Rendez-vous exclusifs", directories: false, sharedLeads: false, unpro: true },
  { feature: "Demande envoyée à plusieurs", directories: false, sharedLeads: true, unpro: false, invertUnpro: true },
  { feature: "Concurrence directe", directories: "Forte", sharedLeads: "Très forte", unpro: "Aucune" },
  { feature: "Guerre de prix", directories: "Fréquente", sharedLeads: "Très fréquente", unpro: "Rare" },
  { feature: "Matching intelligent", directories: false, sharedLeads: "Limité", unpro: true },
  { feature: "Calendrier intégré", directories: "Rare", sharedLeads: "Parfois", unpro: true },
  { feature: "Auto-acceptation", directories: false, sharedLeads: false, unpro: true },
  { feature: "Territoire exclusif", directories: false, sharedLeads: false, unpro: "Potentiel" },
  { feature: "Basé sur données de marché réelles", directories: false, sharedLeads: "Rare", unpro: true },
];

function CellValue({ value, isUnpro, invertUnpro }: { value: boolean | string; isUnpro?: boolean; invertUnpro?: boolean }) {
  if (typeof value === "string") {
    return <span className={cn("text-xs font-medium", isUnpro ? "text-success" : "text-muted-foreground")}>{value}</span>;
  }
  if (value) {
    if (isUnpro) return <CheckCircle2 className="h-4 w-4 text-success mx-auto" />;
    return <CheckCircle2 className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
  }
  // false — for UNPRO with invertUnpro, false is GOOD
  if (isUnpro && invertUnpro) {
    return <span className="text-xs font-semibold text-success">Non ✓</span>;
  }
  return <XCircle className="h-4 w-4 text-muted-foreground/30 mx-auto" />;
}

export default function PlatformComparison() {
  return (
    <section className="px-5 py-16">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Pourquoi UNPRO est différent</h2>
          <p className="text-muted-foreground mt-2">Comparez avec les plateformes traditionnelles.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 md:p-4 font-semibold text-foreground text-xs md:text-sm">Fonctionnalité</th>
                  <th className="text-center p-3 md:p-4 font-medium text-muted-foreground w-24 md:w-28 text-xs">Répertoires</th>
                  <th className="text-center p-3 md:p-4 font-medium text-muted-foreground w-24 md:w-32 text-xs">Leads partagés</th>
                  <th className="text-center p-3 md:p-4 w-24 md:w-32 relative">
                    <div className="absolute inset-0 bg-primary/5" />
                    <div className="relative">
                      <Badge className="bg-primary text-primary-foreground text-[10px] mb-1">
                        <Star className="h-2.5 w-2.5 mr-0.5" /> Meilleure option
                      </Badge>
                      <p className="font-bold text-primary text-xs">UNPRO</p>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, i) => (
                  <tr key={row.feature} className={cn("border-b border-border/50", i % 2 !== 0 && "bg-muted/20")}>
                    <td className="p-3 md:p-4 text-foreground font-medium text-xs md:text-sm">{row.feature}</td>
                    <td className="p-3 md:p-4 text-center"><CellValue value={row.directories} /></td>
                    <td className="p-3 md:p-4 text-center"><CellValue value={row.sharedLeads} /></td>
                    <td className="p-3 md:p-4 text-center relative">
                      <div className="absolute inset-0 bg-primary/5" />
                      <div className="relative"><CellValue value={row.unpro} isUnpro invertUnpro={row.invertUnpro} /></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
