/**
 * UNPRO Condo — Internal Links for SEO cluster
 */
import { Link } from "react-router-dom";
import SectionContainer from "@/components/unpro/SectionContainer";
import SectionHeading from "@/components/unpro/SectionHeading";

const LINKS = [
  { label: "Loi 16 — Copropriété", href: "/loi-16-copropriete" },
  { label: "Attestation de copropriété", href: "/attestation-copropriete" },
  { label: "Fonds de prévoyance", href: "/condos/fonds" },
  { label: "Registre de copropriété", href: "/copropriete" },
  { label: "Autogestion copropriété", href: "/syndicat-copropriete-autogestion" },
  { label: "Portail copropriétaires", href: "/copropriete" },
  { label: "Assemblées de copropriété", href: "/copropriete" },
  { label: "Documents obligatoires", href: "/copropriete" },
];

export default function SectionCondoInternalLinks() {
  return (
    <SectionContainer>
      <SectionHeading
        label="Explorer"
        title="Ressources copropriété"
      />
      <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
        {LINKS.map((l) => (
          <Link
            key={l.label}
            to={l.href}
            className="text-sm border border-border/40 rounded-full px-4 py-2 text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </SectionContainer>
  );
}
