/**
 * ContractorExpressSetup — confirmation express « métier + territoire » (2 clics).
 *
 * Sans ces deux informations exactes, le jumelage retourne toujours 0 résultat.
 * Les villes proviennent de la table `cities` : city_name / city_slug exacts.
 * Aucune donnée inventée : tout est prérempli depuis le profil importé, puis confirmé.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Loader2, MapPin, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { AVG_TICKET_BY_CATEGORY } from "@/config/scanCapacityTickets";

type CityOption = { name: string; slug: string; province: string | null };

const TRADE_OPTIONS = Object.keys(AVG_TICKET_BY_CATEGORY);
const RADIUS_OPTIONS = [15, 25, 40, 60];

interface Props {
  contractorId: string;
  defaultTrade?: string | null;
  defaultCity?: string | null;
  ctaLabel: string;
  onDone: (payload: { trade: string; cities: string[] }) => void;
}

export default function ContractorExpressSetup({
  contractorId,
  defaultTrade,
  defaultCity,
  ctaLabel,
  onDone,
}: Props) {
  const [trade, setTrade] = useState<string>(defaultTrade?.trim() || "");
  const [secondary, setSecondary] = useState<string[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [radius, setRadius] = useState<number>(25);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seeded = useRef(false);

  const tradeChoices = useMemo(() => {
    const base = [...TRADE_OPTIONS];
    if (trade && !base.includes(trade)) base.unshift(trade);
    return base;
  }, [trade]);

  /* Ville principale préremplie depuis la fiche importée, avec le slug exact. */
  useEffect(() => {
    if (seeded.current || !defaultCity) return;
    seeded.current = true;
    void (async () => {
      const { data } = await supabase
        .from("cities")
        .select("name, slug, province")
        .ilike("name", defaultCity.trim())
        .limit(1);
      if (data && data.length > 0) setCities([data[0] as CityOption]);
    })();
  }, [defaultCity]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        const { data } = await supabase
          .from("cities")
          .select("name, slug, province")
          .ilike("name", `${term}%`)
          .order("population", { ascending: false, nullsFirst: false })
          .limit(6);
        setResults((data ?? []) as CityOption[]);
      })();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  const addCity = (city: CityOption) => {
    setCities((prev) => (prev.some((c) => c.slug === city.slug) ? prev : [...prev, city]));
    setQuery("");
    setResults([]);
  };

  const save = useCallback(async () => {
    if (!trade || cities.length === 0) {
      setError("Indiquez votre métier principal et au moins une ville desservie.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: contractorError } = await supabase
        .from("contractors")
        .update({
          specialty: trade,
          services_structured: secondary,
          service_areas: cities.map((c) => c.name),
          travel_radius_km: radius,
        })
        .eq("id", contractorId);
      if (contractorError) throw contractorError;

      const { error: areaError } = await supabase.from("contractor_service_areas").upsert(
        cities.map((city, index) => ({
          contractor_id: contractorId,
          city_name: city.name,
          city_slug: city.slug,
          province: city.province ?? "QC",
          is_primary: index === 0,
          radius_km: radius,
          data_source: "contractor_express_setup",
          validation_status: "declared",
        })),
        { onConflict: "contractor_id,city_slug" },
      );
      if (areaError) throw areaError;

      onDone({ trade, cities: cities.map((c) => c.name) });
    } catch {
      setError("L'enregistrement n'a pas fonctionné. Réessayez dans un instant.");
    } finally {
      setSaving(false);
    }
  }, [trade, secondary, cities, radius, contractorId, onDone]);

  return (
    <div className="rounded-3xl border border-white/12 bg-white/[0.06] p-5 backdrop-blur sm:p-6">
      <h2 className="text-lg font-semibold text-white">Confirmez votre métier et votre territoire</h2>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/70">
        C'est ce qui détermine les demandes que vous recevez.
      </p>

      <p className="mt-5 text-[12px] font-medium uppercase tracking-wide text-white/50">Métier principal</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {tradeChoices.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTrade(option)}
            className={`min-h-11 rounded-full px-4 text-[13.5px] font-medium transition ${
              trade === option
                ? "bg-white text-[#050816]"
                : "border border-white/15 bg-white/[0.04] text-white/80"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <p className="mt-5 text-[12px] font-medium uppercase tracking-wide text-white/50">
        Autres services (optionnel)
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {tradeChoices
          .filter((option) => option !== trade)
          .map((option) => {
            const active = secondary.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() =>
                  setSecondary((prev) =>
                    prev.includes(option) ? prev.filter((t) => t !== option) : [...prev, option],
                  )
                }
                className={`min-h-11 rounded-full px-4 text-[13.5px] transition ${
                  active ? "bg-sky-400/20 text-sky-100" : "border border-white/12 bg-white/[0.03] text-white/65"
                }`}
              >
                {active ? <Check className="mr-1 inline h-3.5 w-3.5" /> : <Plus className="mr-1 inline h-3.5 w-3.5" />}
                {option}
              </button>
            );
          })}
      </div>

      <p className="mt-5 text-[12px] font-medium uppercase tracking-wide text-white/50">Villes desservies</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {cities.map((city) => (
          <span
            key={city.slug}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/[0.1] px-4 text-[13.5px] text-white"
          >
            <MapPin className="h-3.5 w-3.5 text-sky-300" />
            {city.name}
            <button
              type="button"
              aria-label={`Retirer ${city.name}`}
              onClick={() => setCities((prev) => prev.filter((c) => c.slug !== city.slug))}
            >
              <X className="h-3.5 w-3.5 text-white/60" />
            </button>
          </span>
        ))}
      </div>
      <div className="relative mt-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex. Laval, Montréal, Terrebonne"
          className="h-12 rounded-2xl border-white/12 bg-white/[0.04] text-white placeholder:text-white/40"
        />
        {results.length > 0 && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-white/12 bg-[#0b1020] shadow-xl">
            {results.map((city) => (
              <button
                key={city.slug}
                type="button"
                onClick={() => addCity(city)}
                className="block w-full px-4 py-3 text-left text-[14px] text-white/85 hover:bg-white/[0.07]"
              >
                {city.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mt-5 text-[12px] font-medium uppercase tracking-wide text-white/50">Rayon de déplacement</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {RADIUS_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setRadius(option)}
            className={`min-h-11 rounded-full px-4 text-[13.5px] transition ${
              radius === option ? "bg-white text-[#050816]" : "border border-white/15 bg-white/[0.04] text-white/80"
            }`}
          >
            {option} km
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-300/25 bg-rose-400/10 p-3.5 text-[13px] text-rose-100">
          {error}
        </div>
      )}

      <Button
        onClick={() => void save()}
        disabled={saving}
        className="mt-6 h-14 w-full rounded-2xl bg-white text-base font-semibold text-[#050816] hover:bg-white/90"
      >
        {saving ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement…</>
        ) : (
          <>{ctaLabel} <ArrowRight className="ml-1 h-4 w-4" /></>
        )}
      </Button>
    </div>
  );
}
