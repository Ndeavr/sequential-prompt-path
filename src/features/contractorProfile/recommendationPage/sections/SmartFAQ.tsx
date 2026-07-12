/**
 * SmartFAQ — Auto-generated FAQ from contractor data.
 */
interface FaqItem {
  q: string;
  a: string;
}

interface Props {
  contractor: any;
}

export default function SmartFAQ({ contractor: c }: Props) {
  const areas: string[] = c.service_areas ?? [];
  const services: string[] = c.services_structured ?? [];
  const primaryCity = areas[0] || c.city;

  const items: FaqItem[] = [];

  if (primaryCity) {
    items.push({
      q: `${c.business_name} travaille-t-elle à ${primaryCity} ?`,
      a: `Oui. ${c.business_name} dessert ${areas.join(", ") || primaryCity} dans un rayon d'environ ${c.travel_radius_km ?? 15} km.`,
    });
  }

  items.push({
    q: "Cette entreprise est-elle assurée ?",
    a: c.insurance_info
      ? "Oui. L'assurance responsabilité a été confirmée par UNPRO."
      : "L'information d'assurance sera confirmée lors de la prise de contact.",
  });

  items.push({
    q: "Combien de temps pour obtenir une soumission ?",
    a: "En général, une première réponse est confirmée sous 24 à 48 heures. Alex vous accompagne pour préqualifier le projet et accélérer la prise de rendez-vous.",
  });

  if (services.length) {
    items.push({
      q: "Quels types de projets accepte-t-elle ?",
      a: `${c.business_name} offre notamment : ${services.slice(0, 6).join(", ")}.`,
    });
  }

  return (
    <section aria-labelledby="faq-heading" className="space-y-3">
      <h2 id="faq-heading" className="text-lg font-semibold text-foreground">
        Questions fréquentes
      </h2>
      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {items.map((it, i) => (
          <details key={i} className="group px-4 py-3">
            <summary className="cursor-pointer font-medium text-foreground text-sm flex items-center justify-between gap-2">
              {it.q}
              <span className="text-muted-foreground group-open:rotate-45 transition-transform">
                +
              </span>
            </summary>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function buildFaqSchema(contractor: any): { q: string; a: string }[] {
  const areas: string[] = contractor.service_areas ?? [];
  const primaryCity = areas[0] || contractor.city;
  const items = [];
  if (primaryCity) {
    items.push({
      q: `${contractor.business_name} travaille-t-elle à ${primaryCity} ?`,
      a: `Oui. ${contractor.business_name} dessert ${areas.join(", ") || primaryCity} dans un rayon d'environ ${contractor.travel_radius_km ?? 15} km.`,
    });
  }
  items.push({
    q: "Cette entreprise est-elle assurée ?",
    a: contractor.insurance_info
      ? "Oui. L'assurance responsabilité a été confirmée par UNPRO."
      : "L'information d'assurance sera confirmée lors de la prise de contact.",
  });
  items.push({
    q: "Combien de temps pour obtenir une soumission ?",
    a: "Réponse typique sous 24 à 48 heures via Alex.",
  });
  return items;
}
