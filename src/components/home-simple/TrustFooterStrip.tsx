/**
 * TrustFooterStrip — 4 mini reassurance items at the bottom of the page.
 */
import { ShieldCheck, FileText, Lock, Heart } from "lucide-react";

const ITEMS = [
  { icon: ShieldCheck, label: "Entrepreneurs vérifiés et évalués" },
  { icon: FileText,    label: "Soumissions comparables et transparentes" },
  { icon: Lock,        label: "Données protégées et confidentielles" },
  { icon: Heart,       label: "Service 100 % québécois et humain" },
];

export default function TrustFooterStrip() {
  return (
    <section className="px-5 py-4">
      <div className="rounded-3xl bg-card/50 backdrop-blur-md border border-border/30 p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-2.5">
              <span className="shrink-0 w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-xs text-muted-foreground leading-tight">{item.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
