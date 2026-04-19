/**
 * UNPRO — /results
 * Match results: 1 primary recommendation + 2 alternatives + booking CTA.
 * Reads intent from sessionStorage; uses mock cards if none.
 */
import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, MapPin, Star, Calendar, ArrowRight, Sparkles } from "lucide-react";
import PublicLayout from "@/layouts/PublicLayout";
import { Button } from "@/components/ui/button";

interface Intent {
  problem?: string;
  address?: { full?: string; city?: string } | null;
  urgency?: string | null;
  budget?: string | null;
}

interface ContractorMatch {
  id: string;
  name: string;
  specialty: string;
  city: string;
  rating: number;
  reviews: number;
  availability: string;
  matchScore: number;
  badges: string[];
}

const MOCK_PRIMARY: ContractorMatch = {
  id: "p1",
  name: "Construction Boréal",
  specialty: "Toiture & étanchéité",
  city: "Montréal",
  rating: 4.9,
  reviews: 184,
  availability: "Disponible cette semaine",
  matchScore: 96,
  badges: ["Vérifié RBQ", "Garantie 10 ans", "Réponse < 1h"],
};

const MOCK_ALTS: ContractorMatch[] = [
  {
    id: "a1",
    name: "Toitures Lévesque",
    specialty: "Couvreur résidentiel",
    city: "Laval",
    rating: 4.8,
    reviews: 121,
    availability: "Lundi prochain",
    matchScore: 89,
    badges: ["Vérifié RBQ", "20 ans d'expérience"],
  },
  {
    id: "a2",
    name: "ProToit Québec",
    specialty: "Réparation d'urgence",
    city: "Longueuil",
    rating: 4.7,
    reviews: 96,
    availability: "Demain matin",
    matchScore: 84,
    badges: ["Vérifié RBQ", "Service 24/7"],
  },
];

export default function PageResults() {
  const navigate = useNavigate();
  const [intent, setIntent] = useState<Intent | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("unpro_match_intent");
      if (raw) setIntent(JSON.parse(raw));
    } catch {}
  }, []);

  const summary = intent?.problem
    ? `${intent.problem}${intent.address?.city ? ` · ${intent.address.city}` : ""}`
    : "Votre projet";

  return (
    <PublicLayout>
      <Helmet>
        <title>UNPRO — Vos recommandations</title>
        <meta name="description" content="Voici les meilleurs entrepreneurs pour votre projet, sélectionnés par Alex." />
      </Helmet>

      <section className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8 flex flex-col gap-6">
        {/* Header */}
        <header className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 text-xs text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Sélection par Alex
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Voici votre meilleur match
          </h1>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </header>

        {/* Primary recommendation */}
        <ContractorCard match={MOCK_PRIMARY} primary onBook={() => navigate("/checkout?plan=match")} />

        {/* Alternatives */}
        <div className="flex flex-col gap-3 mt-2">
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-medium">
            Autres options qualifiées
          </h2>
          {MOCK_ALTS.map((m) => (
            <ContractorCard key={m.id} match={m} onBook={() => navigate("/checkout?plan=match")} />
          ))}
        </div>

        {/* Refine */}
        <div className="text-center pt-4">
          <Link
            to="/alex-match"
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Préciser ma demande
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}

function ContractorCard({
  match,
  primary,
  onBook,
}: {
  match: ContractorMatch;
  primary?: boolean;
  onBook: () => void;
}) {
  return (
    <article
      className={`rounded-2xl p-5 sm:p-6 flex flex-col gap-4 transition ${
        primary
          ? "bg-gradient-to-br from-primary/10 via-white/5 to-white/[0.02] border border-primary/30 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.3)]"
          : "bg-white/[0.03] border border-white/10 hover:border-white/20"
      }`}
    >
      {primary && (
        <div className="inline-flex items-center gap-1.5 self-start text-xs font-medium px-2.5 py-1 rounded-full bg-primary text-primary-foreground">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Recommandation principale · {match.matchScore}% match
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold truncate">{match.name}</h3>
          <p className="text-sm text-muted-foreground">{match.specialty}</p>
        </div>
        {!primary && (
          <div className="text-xs text-muted-foreground tabular-nums">{match.matchScore}%</div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
          <span className="text-foreground font-medium">{match.rating}</span>
          <span>({match.reviews})</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {match.city}
        </span>
        <span className="inline-flex items-center gap-1 text-emerald-400">
          <Calendar className="h-3.5 w-3.5" />
          {match.availability}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {match.badges.map((b) => (
          <span
            key={b}
            className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground"
          >
            {b}
          </span>
        ))}
      </div>

      <div className="flex gap-2 mt-1">
        <Button onClick={onBook} className="flex-1 h-11 gap-2" size="lg">
          Réserver maintenant
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}
