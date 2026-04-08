/**
 * UNPRO Condo — Lead Magnet Section
 */
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import SectionContainer from "@/components/unpro/SectionContainer";

export default function SectionCondoLeadMagnet() {
  return (
    <SectionContainer>
      <div className="max-w-2xl mx-auto glass-card rounded-2xl border border-primary/20 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
        <div className="p-4 rounded-xl bg-primary/10 shrink-0">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2 text-center md:text-left flex-1">
          <h3 className="text-lg font-display font-bold text-foreground">Checklist gratuite</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Les éléments essentiels à centraliser pour mieux gérer une copropriété au Québec.
            Téléchargez la liste et commencez dès maintenant.
          </p>
        </div>
        <Button variant="outline" className="gap-2 shrink-0">
          <Download className="h-4 w-4" /> Télécharger
        </Button>
      </div>
    </SectionContainer>
  );
}
