import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Star } from "lucide-react";
import { motion } from "framer-motion";

interface Row {
  feature: string;
  directories: boolean | string;
  sharedLeads: boolean | string;
  unpro: boolean | string;
}

const ROWS: Row[] = [
  { feature: "Profil entreprise", directories: true, sharedLeads: true, unpro: true },
  { feature: "Avis clients", directories: true, sharedLeads: true, unpro: true },
  { feature: "Visibilité locale", directories: true, sharedLeads: true, unpro: true },
  { feature: "Rendez-vous garantis", directories: false, sharedLeads: false, unpro: true },
  { feature: "Rendez-vous exclusifs", directories: false, sharedLeads: false, unpro: true },
  { feature: "Demande envoyée à plusieurs", directories: true, sharedLeads: true, unpro: false },
  { feature: "Concurrence directe", directories: "Forte", sharedLeads: "Très forte", unpro: "Aucune" },
  { feature: "Guerre de prix", directories: "Fréquente", sharedLeads: "Très fréquente", unpro: "Rare" },
  { feature: "Matching intelligent", directories: false, sharedLeads: false, unpro: true },
  { feature: "Calendrier intégré", directories: false, sharedLeads: "Parfois", unpro: true },
  { feature: "Auto-acceptation", directories: false, sharedLeads: false, unpro: true },
  { feature: "Territoire exclusif", directories: false, sharedLeads: false, unpro: true },
];

function Cell({ value, isUnpro }: { value: boolean | string; isUnpro?: boolean }) {
  if (typeof value === "string") {
    return <span className={`text-sm font-medium ${isUnpro ? "text-success" : "text-muted-foreground"}`}>{value}</span>;
  }
  // For "Demande envoyée à plusieurs", false is good for UNPRO
  if (value) {
    return isUnpro
      ? <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
      : <CheckCircle2 className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
  }
  return isUnpro
    ? <XCircle className="h-4 w-4 text-muted-foreground/30 mx-auto" />
    : <XCircle className="h-4 w-4 text-muted-foreground/30 mx-auto" />;
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
                  <th className="text-left p-4 font-semibold text-foreground">Fonctionnalité</th>
                  <th className="text-center p-4 font-medium text-muted-foreground w-28">Répertoires</th>
                  <th className="text-center p-4 font-medium text-muted-foreground w-32">Leads partagés</th>
                  <th className="text-center p-4 w-32 relative">
                    <div className="absolute inset-0 bg-primary/5" />
                    <div className="relative">
                      <Badge className="bg-primary text-primary-foreground text-[10px] mb-1">
                        <Star className="h-2.5 w-2.5 mr-0.5" /> Meilleure option
                      </Badge>
                      <p className="font-bold text-primary">UNPRO</p>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-border/50 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                    <td className="p-4 text-foreground font-medium">{row.feature}</td>
                    <td className="p-4 text-center"><Cell value={row.directories} /></td>
                    <td className="p-4 text-center"><Cell value={row.sharedLeads} /></td>
                    <td className="p-4 text-center relative">
                      <div className="absolute inset-0 bg-primary/5" />
                      <div className="relative"><Cell value={row.unpro} isUnpro /></div>
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
