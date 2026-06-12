/**
 * /pro/profile/public/:contractorId — Vue profil entrepreneur post-activation.
 * Lecture publique minimale (best-effort) basée sur founder_score_prospects.
 */
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Loader2,
  Building2,
  MapPin,
  Globe,
  Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  company: string | null;
  trade: string | null;
  city: string | null;
  website: string | null;
  email: string | null;
  score: number | null;
  status: string | null;
  services?: string[] | null;
  cities?: string[] | null;
};

export default function PageProPublicProfile() {
  const { contractorId = "" } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await supabase
          .from("founder_score_prospects" as any)
          .select("id, company, trade, city, website, email, score, status, services, cities")
          .eq("id", contractorId)
          .maybeSingle();
        if (!cancelled) setProfile((data as any) ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (contractorId) load();
    else setLoading(false);
    return () => {
      cancelled = true;
    };
  }, [contractorId]);

  const company = profile?.company ?? "Votre entreprise";
  const trade = profile?.trade ?? "Métier à compléter";
  const city = profile?.city ?? "Ville à compléter";
  const website = profile?.website ?? null;
  const score = profile?.score ?? null;
  const services = profile?.services ?? [];
  const cities = profile?.cities ?? (profile?.city ? [profile.city] : []);

  return (
    <>
      <Helmet>
        <title>{company} — Profil UNPRO</title>
      </Helmet>
      <div className="min-h-screen px-4 py-8 md:py-12" style={{ background: "#0B1220" }}>
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="animate-spin text-amber-400" />
            </div>
          ) : (
            <>
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider mb-3"
                style={{
                  background: "rgba(245,200,90,0.16)",
                  color: "#F5C85A",
                  border: "1px solid rgba(245,200,90,0.35)",
                }}
              >
                <Sparkles size={11} /> Profil Fondateur · Actif
              </div>

              <h1
                className="text-[28px] md:text-[34px] font-extrabold mb-2"
                style={{ color: "#fff", letterSpacing: "-0.03em" }}
              >
                {company}
              </h1>
              <p className="text-[14px] mb-6" style={{ color: "rgba(255,255,255,0.7)" }}>
                {trade} · {city}
              </p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <Stat label="Statut" value="Actif" tone="ok" />
                <Stat label="Plan" value="Fondateur" tone="gold" />
                <Stat label="Paiement" value="Confirmé" tone="ok" />
              </div>

              <Section title="Informations">
                <InfoRow icon={<Building2 size={14} />} label="Entreprise" value={company} />
                <InfoRow icon={<Wrench size={14} />} label="Métier" value={trade} />
                <InfoRow icon={<MapPin size={14} />} label="Ville principale" value={city} />
                {website && (
                  <InfoRow icon={<Globe size={14} />} label="Site web" value={website} />
                )}
              </Section>

              <Section title="Score IA">
                <div className="text-[34px] font-extrabold" style={{ color: "#F5C85A" }}>
                  {score ?? "—"}
                  <span className="text-[14px] font-semibold ml-1" style={{ color: "rgba(255,255,255,0.6)" }}>
                    /100
                  </span>
                </div>
                <p className="text-[12px] mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Calculé par Alex à partir de votre présence numérique.
                </p>
              </Section>

              <Section title="Services détectés">
                {services && services.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {services.map((s) => (
                      <Chip key={s}>{s}</Chip>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                    À compléter avec Alex.
                  </p>
                )}
              </Section>

              <Section title="Villes desservies">
                {cities && cities.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {cities.map((c) => (
                      <Chip key={c}>{c}</Chip>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                    À compléter avec Alex.
                  </p>
                )}
              </Section>

              <Section title="Prochaines actions">
                <ul className="space-y-2">
                  {[
                    "Compléter votre profil avec Alex",
                    "Ajouter vos photos de réalisations",
                    "Confirmer vos disponibilités",
                  ].map((a) => (
                    <li key={a} className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="mt-0.5" style={{ color: "#F5C85A" }} />
                      <span className="text-[13.5px]" style={{ color: "rgba(255,255,255,0.9)" }}>
                        {a}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>

              <div className="space-y-2 mt-6">
                <button
                  onClick={() => navigate("/pro/profile")}
                  className="w-full px-5 py-3.5 rounded-2xl font-bold text-[14.5px] flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #F5C85A 0%, #D4AF37 100%)",
                    color: "#0B1220",
                    boxShadow: "0 10px 24px -8px rgba(245,200,90,0.6)",
                  }}
                >
                  Compléter mon profil <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => navigate("/pro")}
                  className="w-full px-5 py-3 rounded-2xl font-semibold text-[13.5px]"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    color: "#fff",
                  }}
                >
                  Voir comment Alex me recommande
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="w-full px-5 py-3 rounded-2xl font-medium text-[13px]"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  Retour à l'accueil
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-4 md:p-5 border mt-4"
      style={{
        background: "rgba(255,255,255,0.04)",
        borderColor: "rgba(255,255,255,0.12)",
      }}
    >
      <h3 className="text-[11.5px] font-extrabold uppercase tracking-wider mb-3" style={{ color: "#F5C85A" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 text-[12.5px]" style={{ color: "rgba(255,255,255,0.6)" }}>
        {icon} {label}
      </div>
      <div className="text-[13px] font-semibold text-right" style={{ color: "#fff" }}>
        {value}
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex px-2.5 py-1 rounded-full text-[11.5px] font-semibold"
      style={{
        background: "rgba(245,200,90,0.10)",
        color: "#F5C85A",
        border: "1px solid rgba(245,200,90,0.28)",
      }}
    >
      {children}
    </span>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "ok" | "gold" }) {
  const color = tone === "gold" ? "#F5C85A" : "#10B981";
  return (
    <div
      className="rounded-2xl p-3 border text-center"
      style={{
        background: "rgba(255,255,255,0.04)",
        borderColor: "rgba(255,255,255,0.12)",
      }}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.55)" }}>
        {label}
      </div>
      <div className="text-[14px] font-extrabold mt-0.5" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
