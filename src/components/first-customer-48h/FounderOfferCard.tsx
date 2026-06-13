/**
 * FounderOfferCard — 149$/mo Fondateur UNPRO offer block.
 * Dark premium card with feature list, spots counter, and CTA.
 */
import { CheckCircle2, Sparkles } from "lucide-react";
import { useFounderSpotsRemaining } from "@/hooks/useFounderSpotsRemaining";

interface Props {
  onActivate: () => void;
  ctaLabel?: string;
  loading?: boolean;
  checkoutUrl?: string | null;
}

const FEATURES = [
  "Profil IA optimisé",
  "Recommandations propriétaires",
  "Présence UNPRO",
  "Accès Alex (Conseiller Croissance IA)",
  "Jusqu'à 3 rendez-vous exclusifs",
  "Aucun lead partagé",
  "Annulation en tout temps",
];

export default function FounderOfferCard({ onActivate, ctaLabel = "Activer mon profil pour 1 $", loading, checkoutUrl }: Props) {
  const spots = useFounderSpotsRemaining("fondateur-149");
  return (
    <div
      className="rounded-3xl p-5 md:p-6 border relative overflow-hidden"
      style={{
        background:
          "linear-gradient(155deg, #0B1220 0%, #1A1F3A 60%, #2A1F1A 100%)",
        borderColor: "rgba(245,200,90,0.4)",
        boxShadow:
          "0 24px 48px -12px rgba(0,0,0,0.45), 0 8px 24px -6px rgba(245,200,90,0.22)",
      }}
    >
      <div
        aria-hidden
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(245,200,90,0.28) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-[1]">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: "rgba(245,200,90,0.16)",
              color: "#F5C85A",
              border: "1px solid rgba(245,200,90,0.4)",
            }}
          >
            <Sparkles size={10} /> Offre fondateur
          </div>
          {spots !== null && (
            <div
              className="text-[10.5px] font-semibold uppercase tracking-wider"
              style={{ color: "#F5C85A" }}
            >
              {spots > 0 ? `${spots} ${spots === 1 ? "place restante" : "places restantes"}` : "Complet"}
            </div>
          )}
        </div>

        <h3
          className="text-[22px] md:text-[26px] font-extrabold"
          style={{ color: "#fff", letterSpacing: "-0.02em" }}
        >
          Fondateur UNPRO
        </h3>
        <div className="flex items-baseline gap-2 mt-1">
          <span
            className="text-[34px] md:text-[40px] font-extrabold leading-none"
            style={{ color: "#F5C85A" }}
          >
            1 $
          </span>
          <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
            pour 7 jours
          </span>
        </div>
        <p className="text-[12px] mt-1.5" style={{ color: "rgba(255,255,255,0.7)" }}>
          puis <span className="font-semibold" style={{ color: "rgba(255,255,255,0.92)" }}>149 $/mois</span> · annulable en tout temps
        </p>
        <div
          className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider"
          style={{
            background: "rgba(245,200,90,0.10)",
            color: "#F5C85A",
            border: "1px solid rgba(245,200,90,0.28)",
          }}
        >
          Essai Fondateur · 7 jours pour 1 $
        </div>

        <ul className="mt-4 space-y-2">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" style={{ color: "#F5C85A" }} />
              <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.92)" }}>
                {f}
              </span>
            </li>
          ))}
        </ul>

        {checkoutUrl ? (
          <>
            <a
              href={checkoutUrl}
              target="_top"
              rel="noopener"
              className="mt-5 w-full px-5 py-3.5 rounded-2xl font-bold text-[14.5px] transition-transform hover:-translate-y-0.5 flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #F5C85A 0%, #D4AF37 100%)",
                color: "#0B1220",
                boxShadow: "0 10px 24px -8px rgba(245,200,90,0.6)",
              }}
            >
              Activer mon profil pour 1 $ →
            </a>
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-[11px] mt-2 underline"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              Ouvrir le paiement sécurisé →
            </a>
          </>
        ) : (
          <button
            onClick={onActivate}
            disabled={loading || (spots !== null && spots <= 0)}
            className="mt-5 w-full px-5 py-3.5 rounded-2xl font-bold text-[14.5px] transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background:
                "linear-gradient(135deg, #F5C85A 0%, #D4AF37 100%)",
              color: "#0B1220",
              boxShadow: "0 10px 24px -8px rgba(245,200,90,0.6)",
            }}
          >
            {loading ? "Préparation du paiement…" : spots !== null && spots <= 0 ? "Complet" : ctaLabel}
          </button>
        )}
        <p
          className="text-[10.5px] text-center mt-2"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          Paiement sécurisé via Stripe · 1 $ pour 7 jours, puis 149 $/mois
        </p>
      </div>
    </div>
  );
}
