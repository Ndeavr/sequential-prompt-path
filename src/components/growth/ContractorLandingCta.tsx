/**
 * UNPRO — Contractor Acquisition Landing CTA
 * Repositioned: UNPRO does not sell leads. UNPRO recommends the right
 * professional based on the homeowner's Passeport Maison.
 */

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Target, MapPin, Shield } from "lucide-react";
import {
  CONTRACTOR_HERO_H1,
  CONTRACTOR_HERO_SUB,
  CONTRACTOR_CTA,
} from "@/lib/copy/passportPositioning";

const ContractorLandingCta = () => (
  <section className="rounded-xl border bg-card p-6 md:p-8 space-y-5">
    <h2 className="text-xl font-bold text-foreground">{CONTRACTOR_HERO_H1}</h2>
    <p className="text-muted-foreground leading-relaxed">
      {CONTRACTOR_HERO_SUB} UNPRO ne vend pas de leads : nous recommandons
      le bon professionnel au bon moment, selon le profil réel de la propriété.
    </p>

    <div className="grid grid-cols-2 gap-3">
      {[
        { icon: Sparkles, label: "Recommandation IA", desc: "Au bon moment, au bon client" },
        { icon: Target, label: "Contexte propriété", desc: "Basé sur le Passeport Maison" },
        { icon: MapPin, label: "Territoires exclusifs", desc: "Accès par zone" },
        { icon: Shield, label: "Profil vérifié", desc: "Badge de confiance" },
      ].map((item) => (
        <div key={item.label} className="flex items-start gap-2">
          <item.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>

    <div className="flex gap-3">
      <Button asChild>
        <Link to="/signup">{CONTRACTOR_CTA}</Link>
      </Button>
      <Button asChild variant="outline">
        <Link to="/alex">Voir la plateforme</Link>
      </Button>
    </div>
  </section>
);

export default ContractorLandingCta;
