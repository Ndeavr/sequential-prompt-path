/**
 * UNPRO — Contractor Acquisition Landing CTA
 * Shown on public pages to attract contractors.
 */

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, MapPin, Shield } from "lucide-react";

const ContractorLandingCta = () => (
  <section className="rounded-xl border bg-card p-6 md:p-8 space-y-5">
    <h2 className="text-xl font-bold text-foreground">Vous êtes entrepreneur?</h2>
    <p className="text-muted-foreground leading-relaxed">
      Rejoignez UNPRO pour recevoir des demandes qualifiées de propriétaires dans votre région.
    </p>

    <div className="grid grid-cols-2 gap-3">
      {[
        { icon: TrendingUp, label: "Score AIPP", desc: "Mesurez votre performance" },
        { icon: Users, label: "Leads qualifiés", desc: "Demandes vérifiées" },
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
        <Link to="/signup">Activer mon profil</Link>
      </Button>
      <Button asChild variant="outline">
        <Link to="/search">Voir la plateforme</Link>
      </Button>
    </div>
  </section>
);

export default ContractorLandingCta;
